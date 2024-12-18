from bit_battles.utils.decorators import battle_authorized
from bit_battles.battles.models import Battle, Player
from bit_battles.utils.battle import TableGenerator, Simulate
from bit_battles.auth.models import User
from bit_battles.extensions import db, socketio

from flask import Blueprint, g, request

import typing as t
import time
import json


battle_api_blueprint = Blueprint("api", __name__, url_prefix="/api")


@battle_api_blueprint.delete("/battle/<string:id>/leave")
@battle_authorized
def leave_battle(id):
    user: User = g.user
    player: t.Optional[Player] = Player.query.filter_by(battle_id=id, user_id=user.id).first()
    if not player:
        return {"error": "You are not in this battle."}, 400
    
    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return {"error": "This battle does not exist."}, 400
    
    if battle.owner_id == user.id:
        db.session.delete(battle)
        socketio.emit("disband", to=battle.id)
    else:
        battle.players.remove(user)
        socketio.emit("player_leave", {"id": user.id}, to=battle.id)
    
    db.session.commit()
    return {"success": True}, 204


@battle_api_blueprint.post("/battle/<string:id>/start")
@battle_authorized
def start_battle(id):
    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return {"error": "Battle not found."}, 400
    
    user: User = g.user
    if battle.owner_id != user.id:
        return {"error": "You are not hosting this battle."}, 400
    
    if battle.players.count() < 2: # type: ignore
        return {"error": "Not enough players."}, 400
    
    table = TableGenerator(battle.inputs, battle.outputs, None).table
    battle.truthtable = json.dumps(table)
    battle.stage = "battle"
    battle.started_on = time.time() + 3
    db.session.commit()
    
    socketio.emit("update_battle", battle.serialize(), to=battle.id)
    return {"success": True}, 204


@battle_api_blueprint.post("/battle/<string:id>/restart")
@battle_authorized
def restart_battle(id):
    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return {"error": "Battle not found."}, 400
    
    user: User = g.user
    if battle.owner_id != user.id:
        return {"error": "You are not hosting this battle."}, 400
    
    if battle.players.count() < 2: # type: ignore
        return {"error": "Not enough players."}, 400
    
    for player in Player.query.filter_by(battle_id=battle.id).all():
        player.gates = 0
        player.attempts = 0
        player.submission_on = 0
        player.passed = False
        player.score = 0

    battle.stage = "queue"
    db.session.commit()
    
    socketio.emit("update_battle", battle.serialize(), to=battle.id)
    return {"success": True}, 204


@battle_api_blueprint.post("/battle/<string:id>/submit")
@battle_authorized
def submit(id):
    if not request.json:
        return {"error": "Invalid body."}, 400

    user: User = g.user
    player: t.Optional[Player] = Player.query.filter_by(battle_id=id, user_id=user.id).first()
    if not player:
        return {"error": "You are not in this battle."}, 400
    
    if player.passed:
        return {"error": "You already submitted successfully."}, 400

    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return {"error": "Battle not found."}, 400
    
    gates, wires = request.json.get("gates"), request.json.get("wires")

    if not gates or not wires:
        return {"error": "Invalid circuit."}, 400

    player.attempts += 1

    try:
        passed, longest_path = Simulate(
            gates, 
            wires,
            {}
            ).test(json.loads(battle.truthtable))

        gates_used = len(gates) - battle.inputs - battle.outputs

        player.gates = gates_used
        player.longest_path = longest_path

        player.submission_on = time.time()
        player.passed = passed

    except Exception as e:
        db.session.commit()
        return {"error": str(e)}, 400

    players = battle.players.count()
    players_passed = Player.query.filter(Player.battle_id == player.battle_id, Player.attempts > 0, Player.passed == True).count()
    
    if passed:
        socketio.emit("finish", {"id": user.id, "username": user.username, "submission_on": player.submission_on, "gates": player.gates, "longest_path": player.longest_path}, to=player.battle_id)

    if players == players_passed == 2 or players_passed == 3:
        battle.score_players()
        battle.stage = "results"
        socketio.emit("update_battle", battle.serialize(), to=battle.id)

    db.session.commit()

    return {"passed": passed}, 200
