from bit_battles.minigames.truthtables import TableGenerator
from bit_battles.utils.functions import format_seconds
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


class Gates(Enum):
    AND = 0
    OR = 1
    NOT = 2
    XOR = 4
    

class CCPlayer(Player):
    def __init__(self, user: User, battle: "Battle") -> None:
        super().__init__(user, battle)

        self.gates = 0
        self.longest_path = 0

    def reset(self) -> None:
        super().reset()

        self.gates = 0
        self.longest_path = 0

    @require_registration
    def get_message(self, state: SubmissionState) -> str:
        if state == SubmissionState.PASSED:
            return f"{self.username} finished in {format_seconds(self.submission_on - self.battle.started_on)} with {self.gates} gate{'' if self.gates == 1 else 's'} and a longest path of {self.longest_path}."
        
        raise NotImplementedError


class CircuitClash(Battle):
    def __init__(self, owner_id: str, private: bool, inputs: int, outputs: int, gates: list[Gates]) -> None:
        """
        owner_id :user id: of the game host
        inputs :int: amount of input gates
        outputs :int: amount of output gates
        gates :list[Gates]: 

        Generates a truthtable with the given settings
        """
        super().__init__(owner_id, private)
        self.inputs = inputs
        self.outputs = outputs
        self.gates = gates
        self.truthtable = {}

        manager.add_battle(self)

    @require_registration
    def add_player(self, user: User) -> None:
        player = CCPlayer(user, self)

        self.players.append(player)
        manager.add_player(player)

    @require_registration
    def start(self) -> None:
        self.truthtable = TableGenerator(self.inputs, self.outputs, None).table

    @require_registration
    def submit(self, player: Player, data: dict[str, t.Any]) -> tuple[SubmissionState, str | None]:
        gates, wires = data.get("gates"), data.get("wires")
        if not gates or not wires:
            return SubmissionState.ERROR, "Missing circuit data."
        
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

        if not passed:
            return SubmissionState.FAILED, None
        
        success, id = Circuit(gates, wires).save("battle", battle.id, player.user_id)
        if success:
            player.circuit_id = id

        return SubmissionState.PASSED, None


manager = BattleManager()
