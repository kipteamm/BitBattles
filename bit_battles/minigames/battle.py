from bit_battles.minigames.truthtables import TableGenerator
from bit_battles.auth.models import User

from functools import wraps
from enum import Enum

import random
import string


class BattleManager:
    def __init__(self):
        self._battles: dict[str, Battle] = {}
        self._players: dict[str, Player] = {}
        self._public: set[str] = set()

    def add_battle(self, battle: "Battle") -> None:
        self._battles[battle.id] = battle
        if not battle.private:
            self._public.add(battle.id)

        battle.register()

    def remove_battle(self, battle_id: str) -> None:
        battle = self._battles.pop(battle_id)

        for player in battle.players:
            self.remove_player(player.id)

        if not battle.private:
            self._public.discard(battle_id)

    def get_battle(self, battle_id: str) -> "Battle | None":
        battle = self._battles.get(battle_id)
        if not battle:
            return None
        
        return battle

    def get_public(self) -> list["Battle"]:
        return [self._battles[b] for b in self._public]
    
    def add_player(self, player: "Player") -> None:
        self._players[player.id] = player
        player.register()

    def remove_player(self, player_id: str) -> None:
        del self._players[player_id]

    def get_player(self, user_id: str) -> "Player | None":
        player = self._players.get(user_id)
        if not player:
            return None
        
        return player


class Minigames(Enum):
    CIRCUIT_CLASH = 0
    STATE_SPRINT = 1
    PATTERN_PICTIONARY = 2
    PROCESSOR_PARTY = 3


def require_registration(method):
    @wraps(method)
    def wrapper(self, *args, **kwargs):
        if not getattr(self, '_registered', False):
            raise RuntimeError(f"Cannot call {method.__name__} - battle is not registered")
        return method(self, *args, **kwargs)
    return wrapper


class Player:
    def __init__(self, user: User, battle: "Battle") -> None:
        self._registered = False

        self.id = user.id
        self.username = user.username
        self.battle = battle

    def register(self) -> None:
        self._registered = True

    @require_registration
    def serialize(self, *fields: str) -> dict:
        data = {}
        
        for field in fields:
            if field == "battle_id":
                data["battle_id"] = self.battle.id
                continue

            data[field] = getattr(self, field)
        
        return data


BATTLE_ID = string.ascii_letters + string.digits


def _get_id() -> str:
    while True:
        candidate = "".join(random.choices(BATTLE_ID, k=5))
        if not manager.get_battle(candidate):
            return candidate


class Battle:
    def __init__(self, minigame: Minigames, owner_id: str, private: bool) -> None:
        self._minigame = minigame
        self._registered = False
        self.players: list[Player] = []

        self.stage = "queue"
        self.id = _get_id()
        self.private = private
        self.owner_id = owner_id

    def register(self) -> None:
        self._registered = True

    @require_registration
    def add_player(self, user: User) -> None:
        raise NotImplementedError

    @require_registration
    def serialize(self, *fields: str) -> dict:
        data = {}
        
        for field in fields:
            if field == "players":
                data["players"] = [player.serialize("id", "username") for player in self.players]
                continue

            data[field] = getattr(self, field)
        
        return data


class Gates(Enum):
    AND = 0
    OR = 1
    NOT = 2
    XOR = 4
    

class CCPlayer(Player):
    def __init__(self, user: User, battle: "Battle") -> None:
        super().__init__(user, battle)


class CircuitClash(Battle):
    def __init__(self, owner_id: str, private: bool, inputs: int, outputs: int, gates: list[Gates]) -> None:
        """
        owner_id :user id: of the game host
        inputs :int: amount of input gates
        outputs :int: amount of output gates
        gates :list[Gates]: 

        Generates a truthtable with the given settings
        """
        super().__init__(Minigames.CIRCUIT_CLASH, owner_id, private)
        self.inputs = inputs
        self.outputs = outputs
        self.gates = gates
        self.truthtable = TableGenerator(inputs, outputs).table

        manager.add_battle(self)

    @require_registration
    def add_player(self, user: User) -> None:
        player = CCPlayer(user, self)

        self.players.append(player)
        manager.add_player(player)


manager = BattleManager()
