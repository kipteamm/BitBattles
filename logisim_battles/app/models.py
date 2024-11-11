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

    players = db.relationship('User', secondary='players', backref=db.backref('battles', lazy='dynamic'))

    started = db.Column(db.Boolean(), default=False)
    started_on = db.Column(db.Float(), default=None)
    truthtable = db.Column(db.Text(5000), default=None)

    def set_id(self) -> None:
        self.id = "".join(random.choices(BATTLE_ID, k=5))
        while Battle.query.get(self.id):
            self.id = "".join(random.choices(BATTLE_ID, k=5))

    def __init__(self, owner_id: str) -> None:
        self.owner_id = owner_id
        self.set_id()

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "owner_id": self.owner_id,
            "players": Player.serialize(self.players),
            "started": self.started,
            "started_on": self.started_on,
            "truthtable": json.loads(self.truthtable) if self.truthtable else None
        }


class Player(db.Model):
    __tablename__ = "players"

    battle_id = db.Column(db.Integer, db.ForeignKey('battles.id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)

    @classmethod
    def serialize(cls, players: list[User]) -> list:
        return [player.serialize() for player in players]