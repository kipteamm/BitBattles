from bit_battles.minigames.battle import manager, Player
from bit_battles.auth.models import User

from flask_socketio import SocketIO, join_room

import typing as t


def register_events(socketio: SocketIO):
    @socketio.on('join')
    def join(data: dict):
        player: t.Optional[Player] = manager.get_player(data["player_id"])
        if not player:
            return
        
        if player.battle.id != data["battle_id"]:
            return

        join_room(player.battle.id)
        socketio.emit("player_join", {"id": player.id, "username": player.username}, to=player.battle.id)
