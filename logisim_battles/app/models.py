from logisim_battles.auth.models import User
from logisim_battles.extensions import db

import typing as t

import random
import string
import json


BATTLE_ID = string.ascii_letters + string.digits


class Battle(db.Model):
    __tablename__ = "battles"

    id = db.Column(db.String(5), primary_key=True)
    owner_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    inputs = db.Column(db.Integer(), default=3)
    outputs = db.Column(db.Integer(), default=2)
    players = db.relationship('User', secondary='players', backref=db.backref('battles', lazy='dynamic'), lazy='dynamic')

    stage = db.Column(db.String(128), default="queue")
    started_on = db.Column(db.Float(), default=None)
    truthtable = db.Column(db.Text(5000), default=None)

    def _get_players(self) -> list:
        players = []
        # Using .order_by on self.players, now a query object
        for user in self.players.order_by(Player.submission_on): # type: ignore
            data = user.serialize()
            player = Player.query.filter_by(battle_id=self.id, user_id=user.id).first()

            if not player:
                continue

            data.update(player.serialize())
            data["time"] = round(player.submission_on - self.started_on, 3)
            players.append(data)

        return players

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "players": self._get_players(),
            "stage": self.stage,
            "started_on": self.started_on,
            "truthtable": json.loads(self.truthtable) if self.truthtable else None
        }


class Player(db.Model):
    __tablename__ = "players"

    battle_id = db.Column(db.String(128), db.ForeignKey("battles.id", ondelete="CASCADE"), primary_key=True)
    user_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)

    gates = db.Column(db.Integer(), default=0)
    attempts = db.Column(db.Integer(), default=0)
    submission_on = db.Column(db.Integer(), default=0)
    position = db.Column(db.Integer(), default=1)

    def serialize(self) -> dict:
        return {
            "gates": self.gates,
            "attempts": self.attempts,
            "submission_on": self.submission_on,
            "position": self.position
        }