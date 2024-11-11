from logisim_battles.auth.models import User
from logisim_battles.extensions import db
from logisim_battles.config import ALLOWED_CHARACTERS_REGEX

import typing as t


def validate_field(value: str, min_length: int=0, max_length: int=0, type: t.Optional[str]=None) -> tuple[t.Optional[str], str]:
    if len(value) < min_length:
        return None, "Too short"
    
    if len(value) > max_length:
        return None, "Too long"
    
    if type == "email":
        if User.query.filter(db.func.lower(User.email) == db.func.lower(value)).first():
            return None, "Already exists"

    elif type == "username":
        if User.query.filter(db.func.lower(User.username) == db.func.lower(value)).first():
            return None, "Already exists"
        
        if not ALLOWED_CHARACTERS_REGEX.match(value):
            return None, "Username invalid A-z, 0-9, -, _, ."
        
    return value, "No error"