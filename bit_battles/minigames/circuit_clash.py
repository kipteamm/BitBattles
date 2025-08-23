from bit_battles.minigames.truthtables import TableGenerator
from bit_battles.minigames.battle import manager, Battle, Player, SubmissionState, require_registration
from bit_battles.utils.functions import format_seconds
from bit_battles.auth.models import User
from bit_battles.config import PATH_WEIGHT, GATE_WEIGHT

from enum import Enum

import typing as t


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

    @require_registration
    def calculate_scores(self) -> None:
        metrics = (
            db.session.query(
                func.min(Player.longest_path),
                func.min(Player.gates),
                func.max(Player.submission_on)
            )
            .filter(Player.battle_id == self.id, Player.passed == True)
            .first()
        )

        if not metrics:
            return

        shortest_path, least_gates, longest_submission_on = metrics
        shortest_path = shortest_path * PATH_WEIGHT
        least_gates = least_gates * GATE_WEIGHT
        longest_duration = (longest_submission_on - self.started_on)

        players = Player.query.filter_by(battle_id=self.id).all()
        highest_score, winner = None, None
        battle_data = []

        for player in players:
            if not player.passed:
                continue

            player_duration = player.submission_on - self.started_on
            player.score = round(
                (shortest_path / max(player.longest_path, 1))
                + (least_gates / max(player.gates, 1))
                + (longest_duration / max(player_duration, 1))
            )

            # Determine winner
            if not highest_score or player.score > highest_score:
                highest_score = player.score
                winner = player

            battle_data.append({
                "user_id": player.user_id,
                "gates": player.gates,
                "attempts": player.attempts,
                "longest_path": player.longest_path,
                "duration": round(player.submission_on - self.started_on, 3),
            })

        battle_statistics = [
            BattleStatistic(
                self,
                player.user_id,
                player == winner,
                player.passed,
                player.gates,
                player.longest_path,
                player.attempts,
                player.submission_on - self.started_on,
                player.score
            )
            for player in players
            if User.query.get(player.user_id)
        ]

        db.session.bulk_save_objects(battle_statistics)
        db.session.commit()