from bit_battles.minigames.circuit_clash import CircuitClash
from bit_battles.utils.snowflakes import SnowflakeGenerator
from bit_battles.utils.functions import relative_timestamp
from bit_battles.auth.models import User
from bit_battles.extensions import db

import time
    

class CircuitClashStatistics(db.Model):
    __tablename__ = "battle_statistics"

    id = db.Column(db.String(128), primary_key=True, default=SnowflakeGenerator.generate_id)
    user_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"))
    battle_type = db.Column(db.String(128), nullable=False)

    winner = db.Column(db.Boolean(), default=False)
    passed = db.Column(db.Boolean(), default=False)
    gates = db.Column(db.Integer(), default=0)
    longest_path = db.Column(db.Integer(), default=0)
    attempts = db.Column(db.Integer(), default=0)
    duration = db.Column(db.Float(), default=0)
    score = db.Column(db.Integer(), default=0)

    creation_timestamp = db.Column(db.Float(), default=0)

    def __init__(self, battle: CircuitClash, user_id: str, winner: bool, passed: bool, gates: int, longest_path: int, attempts: int, duration: float, score: int) -> None:
        self.user_id = user_id
        self.battle_type = f"{battle.inputs}-{battle.outputs}-{','.join(gate.name for gate in battle.gates)}"
        self.winner = winner
        self.passed = passed
        self.gates = gates
        self.longest_path = longest_path
        self.attempts = attempts
        self.duration = duration
        self.score = score
        self.creation_timestamp = time.time()

    def serialize(self) -> dict:
        battle_type = self.battle_type.split("-")
        
        return {
            "user_id": self.user_id,
            "inputs": battle_type[0],
            "outputs": battle_type[1],
            "battle_gates": battle_type[2],
            "winner": self.winner,
            "passed": self.passed,
            "gates": self.gates,
            "longest_path": self.longest_path,
            "attempts": self.attempts,
            "duration": self.duration,
            "score": self.score,
            "relative_timestamp": relative_timestamp(self.creation_timestamp),
        }
    
    def leaderboard_serialize(self) -> dict:
        user = User.query.with_entities(
            User.username # type: ignore
        ).filter_by(id=self.user_id).first()
        if not user:
            return {}

        relative_time = round(time.time() - self.creation_timestamp)

        return {
            "username": user.username,
            "score": self.score,
            "relative_timestamp": f"{relative_time // 60}m {relative_time % 60}s ago"
        }
