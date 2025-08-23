from bit_battles.auth.models import User

from functools import wraps
from enum import Enum

import typing as t
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

    def remove_battle(self, battle: 'Battle') -> None:
        for player in battle.players:
            self.remove_player(player.id)

        battle.players.clear()
        if not battle.private:
            self._public.discard(battle.id)

        del self._battles[battle.id]

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

    def remove_player(self, player: "Player") -> None:
        player.battle.players.remove(player)

        del self._players[player.id]

    def get_player(self, user_id: str) -> "Player | None":
        player = self._players.get(user_id)
        if not player:
            return None
        
        return player


def require_registration(method):
    @wraps(method)
    def wrapper(self, *args, **kwargs):
        if not getattr(self, '_registered', False):
            raise RuntimeError(f"Cannot call {method.__name__} - battle is not registered")
        return method(self, *args, **kwargs)
    return wrapper


class SubmissionState(Enum):
    PASSED = 1
    FAILED = 2
    ERROR = 3


class Player:
    def __init__(self, user: User, battle: "Battle") -> None:
        self._registered = False

        self.id = user.id
        self.username = user.username
        self.battle = battle

        self.attempts: int = 0
        self.passed: bool = False
        self.submission_on: float = 0
        self.score: float = 0

    def register(self) -> None:
        self._registered = True

    @require_registration
    def reset(self) -> None:
        self.attempts = 0
        self.submission_on = 0
        self.passed = False
        self.score = 0

    @require_registration
    def get_message(self, state: SubmissionState) -> str:
        raise NotImplementedError
        

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
    def __init__(self, owner_id: str, private: bool) -> None:
        self._registered: bool = False

        self.players: list[Player] = []
        self.started_on: float = 0
        self.stage: str = "queue"

        self.id: str = _get_id()
        self.private: bool = private
        self.owner_id: str = owner_id

    def register(self) -> None:
        self._registered = True

    @require_registration
    def add_player(self, user: User) -> None:
        raise NotImplementedError
    
    @require_registration
    def start(self) -> None:
        raise NotImplementedError

    @require_registration
    def players_passed(self) -> int:
        return sum(int(player.passed) for player in self.players)

    @require_registration
    def submit(self, player: Player, data: dict[str, t.Any]) -> tuple[SubmissionState, str]:
        raise NotImplementedError
   
    @require_registration
    def calculate_scores(self) -> None:
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


manager = BattleManager()
