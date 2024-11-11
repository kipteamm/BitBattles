from logisim_battles.auth.models import User

from functools import wraps
from flask import request, g


def battle_authorized(f):
    @wraps(f)

    def _decorated_function(*args, **kwargs):
        authorization = request.authorization

        if not authorization:
            return {"error": "Authorization header not found."}, 401
        
        if not authorization.type == "bearer":
            return {"error": "Invalid authorization header, expected bearer."}, 401
        
        g.user = User.query.filter_by(battle_token=authorization.token).first()

        if not g.user:
            return {"error": "Invalid authorization header."}, 401

        return f(*args, **kwargs)
    return _decorated_function