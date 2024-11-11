from logisim_battles.utils.snowflakes import SnowflakeGenerator 
from logisim_battles.extensions import db

from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

import typing as t

import time


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    # Authentication
    id = db.Column(db.String(128), primary_key=True, default=SnowflakeGenerator.generate_id)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    
    username = db.Column(db.String(30), nullable=False, unique=True)
    creation_timestamp = db.Column(db.Float(), nullable=False, unique=False)

    def __init__(self, email, password, username):
        self.email = email
        self.set_password(password)
        self.username = username
        self.creation_timestamp = time.time()

    def set_password(self, password):
        self.password = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password, password)
    
    @staticmethod
    def authenticate(value: str, password: str) -> t.Optional['User']:
        if "@" in value:
            user = User.query.filter_by(email=value).first()

        else:
            user = User.query.filter_by(username=value).first()
        
        if user and user.check_password(password):
            return user
        
        return None
