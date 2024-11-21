from bit_battles.utils.snowflakes import SnowflakeGenerator
from bit_battles.utils.battle import TableGenerator
from bit_battles.auth.models import User
from bit_battles.extensions import db

from sqlalchemy import func
from datetime import datetime, timezone

import typing as t

import random
import string
import json
import math
import time
import os


BATTLE_ID = string.ascii_letters + string.digits
PATH_WEIGHT = 40
GATE_WEIGHT = 30
DURATION_WEIGHT = 20


class Battle(db.Model):
    __tablename__ = "battles"

    id = db.Column(db.String(5), primary_key=True)
    owner_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    inputs = db.Column(db.Integer(), default=3)
    outputs = db.Column(db.Integer(), default=2)
    gates = db.Column(db.String(128), default="['AND', 'NOT', 'OR']")
    private = db.Column(db.Boolean(), default=False)
    players = db.relationship('User', secondary='players', backref=db.backref('battles', lazy='dynamic'), lazy='dynamic')

    stage = db.Column(db.String(128), default="queue")
    started_on = db.Column(db.Float(), default=0)
    truthtable = db.Column(db.Text(5000), default=None)

    def set_id(self) -> None:
        self.id = "".join(random.choices(BATTLE_ID, k=5))
        while Battle.query.get(self.id):
            self.id = "".join(random.choices(BATTLE_ID, k=5))

    def __init__(self, owner_id: str, inputs: int=3, outputs: int=2, gates: list=["AND", "NOT", "OR"], private: bool=False) -> None:
        self.owner_id = owner_id
        self.inputs = inputs
        self.outputs = outputs
        self.gates = json.dumps(gates)
        self.private = private
        self.set_id()

    def _get_players(self) -> list:
        players = []

        for user in self.players.order_by(Player.score.desc()): # type: ignore
            data = user.serialize()
            player = Player.query.filter_by(battle_id=self.id, user_id=user.id).first()

            if not player:
                continue

            data.update(player.serialize())
            data["time"] = round(player.submission_on - self.started_on, 3)
            players.append(data)

        return players
    
    def score_players(self) -> None:
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
        longest_duration = (longest_submission_on - self.started_on) * DURATION_WEIGHT

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

        # Ensure a directory for storing JSON files
        os.makedirs("battle_data", exist_ok=True)
        json_file_path = os.path.join("battle_data", f"{self.id}-{self.started_on}.json")

        with open(json_file_path, "w") as json_file:
            json.dump({"battle_id": self.id, "players": battle_data,}, json_file, indent=4)

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "players": self._get_players(),
            "stage": self.stage,
            "started_on": self.started_on,
            "truthtable": json.loads(self.truthtable) if self.truthtable else None,
            "gates": json.loads(self.gates)
        }


class Player(db.Model):
    __tablename__ = "players"

    battle_id = db.Column(db.String(128), db.ForeignKey("battles.id", ondelete="CASCADE"), primary_key=True)
    user_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    gates = db.Column(db.Integer(), default=0)
    attempts = db.Column(db.Integer(), default=0)
    longest_path = db.Column(db.Integer(), default=0)
    submission_on = db.Column(db.Integer(), default=0)
    passed = db.Column(db.Boolean(), default=False)
    score = db.Column(db.Integer(), default=0)

    def serialize(self) -> dict:
        return {
            "gates": self.gates,
            "attempts": self.attempts,
            "longest_path": self.longest_path,
            "submission_on": self.submission_on,
            "passed": self.passed,
            "score": self.score
        }
    

class BattleStatistic(db.Model):
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

    def __init__(self, battle: Battle, user_id: str, winner: bool, passed: bool, gates: int, longest_path: int, attempts: int, duration: float, score: int) -> None:
        self.user_id = user_id
        self.battle_type = f"{battle.inputs}-{battle.outputs}-{battle.gates}"
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
            "score": self.score
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


class Challenge(db.Model):
    __tablename__ = "challenges"

    date = db.Column(db.Date, primary_key=True, unique=True, nullable=False)
    truthtable = db.Column(db.Text(5000))

    def __init__(self, date) -> None:
        self.date = date
        self.truthtable = json.dumps(TableGenerator(3, 2).table)

    @classmethod
    def get_or_create(cls, date) -> 'Challenge':
        challenge = Challenge.query.filter_by(date=date).first()

        if challenge:
           return challenge

        challenge = Challenge(date)
        db.session.add(challenge)
        db.session.commit()

        return challenge

    def serialize(self) -> dict:
        return {
            "date": self.date.strftime("%Y-%m-%d"),
            "truthtable": json.loads(self.truthtable),
        }
    

class ChallengeStatistic(db.Model):
    __tablename__ = "challenge_statistics"

    id = db.Column(db.String(128), primary_key=True, default=SnowflakeGenerator.generate_id)
    user_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"))
    date = db.Column(db.Date, nullable=False)
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
    def get_or_create(cls, user_id: str, date) -> 'ChallengeStatistic':
        challenge_statistic = ChallengeStatistic.query.filter_by(user_id=user_id, date=date).first()

        if challenge_statistic:
           return challenge_statistic

        challenge_statistic = ChallengeStatistic(user_id, date)
        db.session.add(challenge_statistic)
        db.session.commit()

        return challenge_statistic
    
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
            "gates": self.gates,
            "longest_path": self.longest_path,
            "duration": f"{round(self.duration // 60)}m {round(self.duration % 60)}s",
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