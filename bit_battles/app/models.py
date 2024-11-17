from bit_battles.utils.snowflakes import SnowflakeGenerator
from bit_battles.auth.models import User
from bit_battles.extensions import db

from sqlalchemy import func

import typing as t

import random
import string
import json
import math
import time
import os


BATTLE_ID = string.ascii_letters + string.digits


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

    average_gates = db.Column(db.Integer(), default=0)

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
        # Using .order_by on self.players, now a query object
        for user in self.players.order_by(Player.score): # type: ignore
            data = user.serialize()
            player = Player.query.filter_by(battle_id=self.id, user_id=user.id).first()

            if not player:
                continue

            data.update(player.serialize())
            data["time"] = round(player.submission_on - self.started_on, 3)
            players.append(data)

        return players
    
    def score_players(self) -> None:
        average = math.floor(
            db.session.query(func.avg(Player.gates))
            .filter(Player.battle_id == self.id, Player.attempts > 0)
            .scalar()
        )
        self.average_gates = average

        highest_score = 0
        lowest_score, winner = None, None
        players_data = []  # Data to be saved to JSON
        players = []

        for player in Player.query.filter_by(battle_id=self.id).all():
            if not player.passed:
                continue

            player.score = round(player.submission_on - self.started_on) - ((average - player.gates) * 10)
            players.append(player)

            if not highest_score or player.score > highest_score:
                highest_score = player.score

            if not lowest_score or player.score < lowest_score:
                lowest_score = player.score
                winner = player

            # Collect player stats for JSON
            players_data.append({
                "user_id": player.user_id,
                "gates": player.gates,
                "attempts": player.attempts,
                "longest_path": player.longest_path,
                "duration": round(player.submission_on - self.started_on, 3),
            })

        for player in players:
            user: t.Optional[User] = User.query.get(player.user_id)
            if not user:
                continue

            if not player.passed:
                player.score = highest_score

            battle_statistics = BattleStatistic(
                self, 
                player.user_id,
                (player == winner),
                player.passed,
                player.gates, 
                player.longest_path,
                player.attempts, 
                (player.submission_on - self.started_on),
                (highest_score - player.score) + (50 * player.passed)
            )
            db.session.add(battle_statistics)

        db.session.commit()

        # Save battle data to JSON
        battle_data = {
            "battle_id": self.id,
            "players": players_data,
        }

        # Ensure a directory for storing JSON files
        os.makedirs("battle_data", exist_ok=True)
        json_file_path = os.path.join("battle_data", f"{self.id}-{self.started_on}.json")

        with open(json_file_path, "w") as json_file:
            json.dump(battle_data, json_file, indent=4)

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "players": self._get_players(),
            "stage": self.stage,
            "started_on": self.started_on,
            "truthtable": json.loads(self.truthtable) if self.truthtable else None,
            "average_gates": self.average_gates,
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
