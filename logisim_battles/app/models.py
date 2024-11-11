from logisim_battles.extensions import db

import random
import string

BATTLE_ID = string.ascii_letters + string.digits


class Battle(db.Model):
    __tablename__ = "battles"

    id = db.Column(db.String(5), primary_key=True)
    owner_id = db.Column(db.String(128), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    started = db.Column(db.Boolean(), default=False)

    players = db.relationship('User', secondary='players', backref=db.backref('battles', lazy='dynamic'))

    def set_id(self) -> None:
        self.id = "".join(random.choices(BATTLE_ID, k=5))
        while Battle.query.get(self.id):
            self.id = "".join(random.choices(BATTLE_ID, k=5))

    def __init__(self, owner_id: str) -> None:
        self.owner_id = owner_id
        self.set_id()


class Player(db.Model):
    __tablename__ = "players"

    battle_id = db.Column(db.Integer, db.ForeignKey('battles.id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
