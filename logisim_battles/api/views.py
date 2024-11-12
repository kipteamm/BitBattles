from logisim_battles.utils.decorators import battle_authorized
from logisim_battles.utils.battle import TableGenerator, Simulate
from logisim_battles.auth.models import User
from logisim_battles.app.models import Battle, Player
from logisim_battles.extensions import db, socketio

from flask import Blueprint, g, request

import typing as t
import time
import json


api_blueprint = Blueprint("api", __name__, url_prefix="/api")


@api_blueprint.delete("/battle/<string:id>/leave")
@battle_authorized
def leave_battle(id):
    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return {"error": "Nothing found."}, 400
    
    user: User = g.user
    if battle.owner_id == user.id:
        db.session.delete(battle)
    else:
        battle.players.remove(user)
        socketio.emit("player_leave", {"id": user.id}, room=battle.id)
    
    db.session.commit()
    return {"success": True}, 204


@api_blueprint.post("/battle/<string:id>/start")
@battle_authorized
def start_battle(id):
    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return {"error": "Nothing found."}, 400
    
    user: User = g.user
    if battle.owner_id != user.id:
        return {"error": "You are not hosting this battle."}, 400
    
    if len(battle.players) < 2: # type: ignore
        return {"error": "Not enough players."}, 400
    
    battle.truthtable = json.dumps(TableGenerator(battle.inputs, battle.outputs).table)
    battle.started = True
    battle.started_on = time.time()
    db.session.commit()
    
    socketio.emit("start", room=battle.id)
    return {"success": True}, 204


@api_blueprint.post("/battle/<string:id>/submit")
@battle_authorized
def submit(id):
    user: User = g.user
    player: t.Optional[Player] = Player.query.filter_by(battle_id=id, user_id=user.id).first()
    if not player:
        return {"error": "Nothing found."}, 400

    if not request.json:
        return {"error": "Invalid body."}, 400

    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return {"error": "Battle not found."}, 400
    
    gates, wires = request.json.get("gates"), request.json.get("wires")

    if not gates or not wires:
        return {"error": "Invalid circuit."}, 400

    player.attempts += 1

    try:
        passed = Simulate(
            gates, 
            wires
            ).test(json.loads(battle.truthtable))

        player.gates = len(gates) - battle.inputs - battle.outputs
        player.submission_on = time.time()
        db.session.commit()

    except:
        db.session.commit()
        return {"error": "Simulation error, invalid circuit."}, 400

    socketio.emit("finish", {"id": user.id, "username": user.username, "submission_on": player.submission_on, "gates": player.gates}, room=player.battle_id)

    return {"passed": passed}, 200
