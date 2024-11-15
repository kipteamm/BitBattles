from logisim_battles.utils.snowflakes import SnowflakeGenerator
from logisim_battles.auth.models import User
from logisim_battles.extensions import db

from sqlalchemy import func

import typing as t

import random
import string
import json
import math


BATTLE_ID = string.ascii_letters + string.digits


class Battle(db.Model):
    __tablename__ = "battles"

    id = db.Column(db.String(5), primary_key=True)
    owner_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    inputs = db.Column(db.Integer(), default=3)
    outputs = db.Column(db.Integer(), default=2)
    gates = db.Column(db.String(128), default="['AND', 'NOT', 'OR']")
    players = db.relationship('User', secondary='players', backref=db.backref('battles', lazy='dynamic'), lazy='dynamic')

    stage = db.Column(db.String(128), default="queue")
    started_on = db.Column(db.Float(), default=0)
    truthtable = db.Column(db.Text(5000), default=None)

    average_gates = db.Column(db.Integer(), default=0)

    def set_id(self) -> None:
        self.id = "".join(random.choices(BATTLE_ID, k=5))
        while Battle.query.get(self.id):
            self.id = "".join(random.choices(BATTLE_ID, k=5))

    def __init__(self, owner_id: str, inputs: int=3, outputs: int=2, gates: list=["AND", "NOT", "OR"]) -> None:
        self.owner_id = owner_id
        self.inputs = inputs
        self.outputs = outputs
        self.gates = json.dumps(gates)
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
        average = math.floor(db.session.query(func.avg(Player.gates)).filter(Player.battle_id == self.id, Player.attempts > 0).scalar())
        self.average_gates = average

        highest_score = None
        lowest_score, winner = None, None
        players = []

        for player in Player.query.filter_by(battle_id=self.id).all():
            player.score = round(player.submission_on - self.started_on) - ((average - player.gates) * 10)
            players.append(player)

            if not highest_score or player.score > highest_score:
                highest_score = player.score

            elif not lowest_score or player.score < lowest_score:
                lowest_score = player.score
                winner = player

        for player in players:
            user: t.Optional[User] = User.query.get(player.user_id)
            if not user:
                continue

            battle_statistics = BattleStatistic(
                self, 
                player.user_id,
                (player == winner),
                player.gates, 
                player.attempts, 
                (player.submission_on - self.started_on),
                (highest_score - player.score) + 50
            )
            db.session.add(battle_statistics)

        db.session.commit()

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
    submission_on = db.Column(db.Integer(), default=0)
    score = db.Column(db.Integer(), default=0)

    def serialize(self) -> dict:
        return {
            "gates": self.gates,
            "attempts": self.attempts,
            "submission_on": self.submission_on,
            "score": self.score
        }
    

class BattleStatistic(db.Model):
    __tablename__ = "battle_statistics"

    id = db.Column(db.String(128), primary_key=True, default=SnowflakeGenerator.generate_id)
    battle_id = db.Column(db.String(128), db.ForeignKey("battles.id", ondelete="CASCADE"))
    user_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"))
    battle_type = db.Column(db.String(128), nullable=False)

    winner = db.Column(db.Boolean(), default=False)
    gates = db.Column(db.Integer(), default=0)
    attempts = db.Column(db.Integer(), default=0)
    duration = db.Column(db.Float(), default=0)
    score = db.Column(db.Integer(), default=0)

    def __init__(self, battle: Battle, user_id: str, winner: bool, gates: int, attempts: int, duration: float, score: int) -> None:
        self.battle_id = battle.id
        self.user_id = user_id
        self.battle_type = f"{battle.inputs}-{battle.outputs}-{battle.gates}"
        self.winner = winner
        self.gates = gates
        self.attempts = attempts
        self.duration = duration
        self.score = score

    def serialize(self) -> dict:
        battle_type = self.battle_type.split("-")
        
        return {
            "battle_id": self.battle_id,
            "user_id": self.user_id,
            "inputs": battle_type[0],
            "outputs": battle_type[1],
            "battle_gates": battle_type[2],
            "winner": self.winner,
            "gates": self.gates,
            "attempts": self.attempts,
            "duration": self.duration,
            "score": self.score
        }
