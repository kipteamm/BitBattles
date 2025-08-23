from bit_battles.utils.decorators import battle_authorized
from bit_battles.minigames.battle import manager, Player, Battle, SubmissionState
from bit_battles.auth.models import User
from bit_battles.extensions import db, socketio

from flask import Blueprint, g, request

import typing as t
import time


battle_api_blueprint = Blueprint("api", __name__, url_prefix="/api")


@battle_api_blueprint.delete("/battle/<string:id>/leave")
@battle_authorized
def leave_battle(id):
    user: User = g.user
    player: t.Optional[Player] = manager.get_player(user.id)
    
    if not player or player.battle.id != id:
        return {"error": "You are not in this battle."}, 400
    
    battle: t.Optional[Battle] = manager.get_battle(id)
    if not battle:
        return {"error": "This battle does not exist."}, 400
    
    if battle.owner_id == user.id:
        socketio.emit("disband", to=battle.id)
        manager.remove_battle(battle)

    else:
        manager.remove_player(player)
        socketio.emit("player_leave", {"id": user.id}, to=battle.id)
    
    return {"success": True}, 204


@battle_api_blueprint.post("/battle/<string:id>/start")
@battle_authorized
def start_battle(id):
    user: User = g.user
    battle: t.Optional[Battle] = manager.get_battle(id)

    if not battle:
        return {"error": "Battle not found."}, 400
    
    if battle.owner_id != user.id:
        return {"error": "You are not hosting this battle."}, 400
    
    if len(battle.players) < 2:
        return {"error": "Not enough players."}, 400
    
    battle.start()
    battle.stage = "battle"
    battle.started_on = time.time() + 3 # the extra 3 second added by the countdown

    socketio.emit("update_battle", battle.serialize(), to=battle.id)
    return {"success": True}, 204


@battle_api_blueprint.post("/battle/<string:id>/new")
@battle_authorized
def new_round(id):
    user: User = g.user
    battle: t.Optional[Battle] = manager.get_battle(id)
    if not battle:
        return {"error": "Battle not found."}, 400
    
    if battle.owner_id != user.id:
        return {"error": "You are not hosting this battle."}, 400
    
    if len(battle.players) < 2:
        return {"error": "Not enough players."}, 400
    
    for player in battle.players:
        player.reset()

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
    player: t.Optional[Player] = manager.get_player(user.id)
    
    if not player or player.battle.id != id:
        return {"error": "You are not in this battle."}, 400
    
    if player.passed:
        return {"error": "You already submitted successfully."}, 400

    battle: t.Optional[Battle] = manager.get_battle(id)
    if not battle:
        return {"error": "Battle not found."}, 400
    
    state, message = battle.submit(player, request.json)
    if state == SubmissionState.ERROR:
        return {"error": message}, 400

    player.attempts += 1

    players = len(battle.players)
    players_passed = battle.players_passed()
    
    if state == SubmissionState.PASSED:
        socketio.emit("finish", {
            "id": player.id,
            "message": player.get_message(SubmissionState.PASSED)
        }, to=id)

    if players_passed + 1 == min(players, 3):
        socketio.emit("give_up", to=battle.id)
        db.session.commit()
        return {"passed": player.passed}, 200

    # QUESTIONABLE
    if (players_passed == 2 and players == 2) or players_passed == 3:
        battle.calculate_scores()
        battle.stage = "results"
        socketio.emit("update_battle", battle.serialize(), to=battle.id)

    db.session.commit()
    return {"passed": player.passed}, 200


@battle_api_blueprint.patch("/battle/<string:id>/give-up")
@battle_authorized
def give_up(id):
    user: User = g.user
    player: t.Optional[Player] = manager.get_player(user.id)
    
    if not player or player.battle.id != id:
        return {"error": "You are not in this battle."}, 400

    battle: t.Optional[Battle] = manager.get_battle(id)
    if not battle:
        return {"error": "Battle not found."}, 400

    players_passed = battle.players_passed()
    players = len(battle.players)

    if players_passed < min(players, 3):
        return {"error": "You can't yet give up."}, 400
    
    if (players_passed == 2 and players == 2) or players_passed == 3:
        battle.calculate_scores()
        battle.stage = "results"
        socketio.emit("update_battle", battle.serialize(), to=battle.id)
    
    return {"success": True}, 204
