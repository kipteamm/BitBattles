from bit_battles.utils.snowflakes import SnowflakeGenerator
from bit_battles.utils.battle import TableGenerator
from bit_battles.auth.models import User
from bit_battles.extensions import db
from bit_battles.config import PATH_WEIGHT, GATE_WEIGHT, DURATION_WEIGHT

from datetime import datetime, timezone, timedelta

import typing as t
import json
import time


class DailyChallenge(db.Model):
    __tablename__ = "daily_challenges"

    date = db.Column(db.Date, primary_key=True, unique=True, nullable=False)
    truthtable = db.Column(db.Text(5000))

    def __init__(self, date) -> None:
        self.date = date
        self.truthtable = json.dumps(TableGenerator(3, 2, None).table)

    @classmethod
    def get_or_create(cls, date) -> 'DailyChallenge':
        challenge = DailyChallenge.query.filter_by(date=date).first()

        if challenge:
           return challenge

        challenge = DailyChallenge(date)
        db.session.add(challenge)
        db.session.commit()

        return challenge

    def serialize(self) -> dict:
        return {
            "date": self.date.strftime("%Y-%m-%d"),
            "truthtable": json.loads(self.truthtable),
        }
    

class DailyChallengeStatistic(db.Model):
    __tablename__ = "daily_challenge_statistics"

    id = db.Column(db.String(128), primary_key=True, default=SnowflakeGenerator.generate_id)
    user_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"))
    date = db.Column(db.Date, nullable=False)
    circuit = db.Column(db.String(128), nullable=True, default=None)
    score = db.Column(db.Float(), default=0)

    passed = db.Column(db.Boolean(), default=False)
    gates = db.Column(db.Integer(), default=0)
    longest_path = db.Column(db.Integer(), default=0)
    attempts = db.Column(db.Integer(), default=0)

    started_on = db.Column(db.Float(), default=0)
    duration = db.Column(db.Float(), default=0)

    def __init__(self, user_id: str, date):
        self.user_id = user_id
        self.date = date
        self.started_on = time.time()

    @classmethod
    def get_or_create(cls, user_id: str, date) -> 'DailyChallengeStatistic':
        challenge_statistic = DailyChallengeStatistic.query.filter_by(user_id=user_id, date=date).first()

        if challenge_statistic:
           return challenge_statistic

        challenge_statistic = DailyChallengeStatistic(user_id, date)
        db.session.add(challenge_statistic)
        db.session.commit()

        return challenge_statistic
    
    @classmethod
    def get_streak(cls, user_id: str) -> int:
        today = datetime.now(timezone.utc).date()
        
        challenges = (
            DailyChallengeStatistic.query
            .filter(
                DailyChallengeStatistic.user_id == user_id, # type: ignore
                DailyChallengeStatistic.passed == True,
                DailyChallengeStatistic.date <= today
            )
            .order_by(DailyChallengeStatistic.date.desc())
            .all()
        )

        streak = 0
        for challenge in challenges:
            if challenge.date != today - timedelta(days=(streak + 1)) and challenge.date != today - timedelta(days=streak):
                break
            streak += 1

        return streak
    
    def set_score(self) -> None:
        self.score = round(
            (GATE_WEIGHT / max(self.gates, 1)) 
            + (PATH_WEIGHT / max(self.longest_path, 1)) 
            + (DURATION_WEIGHT / max(self.duration, 1))
        )

    def leaderboard_serialize(self) -> dict:
        user = User.query.with_entities(
            User.username # type: ignore
        ).filter_by(id=self.user_id).first()
        if not user:
            return {}

        return {
            "user_id": self.user_id,
            "username": user.username,
            "streak": self.get_streak(self.user_id),
            "gates": self.gates,
            "longest_path": self.longest_path,
            "duration": f"{round(self.duration // 60)}m {round(self.duration % 60)}s",
            "circuit": self.circuit,
            "score": self.score
        }

    def serialize(self) -> dict:
        return {
            "user_id": self.user_id,
            "date": self.date,
            "passed": self.passed,
            "gates": self.gates,
            "longest_path": self.longest_path,
            "attempts": self.attempts,
            "duration": self.duration,
        }


class Challenge(db.Model):
    __tablename__ = "challenges"

    id = db.Column(db.String(128), primary_key=True, default=SnowflakeGenerator.generate_id)
    user_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"))

    official = db.Column(db.Boolean(), default=False)
    difficulty = db.Column(db.Integer(), default=0)

    and_gates = db.Column(db.Integer(), default=None, nullable=True)
    or_gates = db.Column(db.Integer(), default=None, nullable=True)
    not_gates = db.Column(db.Integer(), default=None, nullable=True)
    xor_gates = db.Column(db.Integer(), default=None, nullable=True)

    inputs = db.Column(db.Integer(), default=1)
    outputs = db.Column(db.Text(5000))

    description = db.Column(db.Text(5000), default=None, nullable=True)

    creation_timestamp = db.Column(db.Float(), nullable=False)

    def __init__(self, user_id: str) -> None:
        self.user_id = user_id
        self.outputs = "{'Z':[0,0]}"
        self.creation_timestamp = time.time()

    def serialize(self) -> dict:
        outputs = json.loads(self.outputs)
        truthtable = TableGenerator(self.inputs, len(outputs.keys()), outputs).table

        return {
            "id": self.id,
            "user_id": self.user_id,
            "and_gates": self.and_gates,
            "or_gates": self.or_gates,
            "not_gates": self.not_gates,
            "xor_gates": self.xor_gates,
            "truthtable": truthtable,
            "description": self.description
        }

    def edit_serialize(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "and_gates": self.and_gates,
            "or_gates": self.or_gates,
            "not_gates": self.not_gates,
            "xor_gates": self.xor_gates,
            "inputs": self.inputs,
            "outputs": json.loads(self.outputs),
            "description": self.description
        }
