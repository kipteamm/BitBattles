from logisim_battles.utils.decorators import battle_authorized
from logisim_battles.auth.models import User
from logisim_battles.app.models import Battle
from logisim_battles.extensions import db, socketio

from flask import Blueprint, g

import typing as t


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
