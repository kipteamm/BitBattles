from bit_battles.utils.decorators import user_authorized
from bit_battles.utils.battle import Simulate
from bit_battles.auth.models import User
from bit_battles.app.models import ChallengeStatistic, Challenge
from bit_battles.extensions import db

from datetime import datetime
from flask import Blueprint, g, request

import typing as t
import json
import time


challenge_api_blueprint = Blueprint("challenge_api", __name__, url_prefix="/api")


@challenge_api_blueprint.post("/challenge/<string:date>/submit")
@user_authorized
def submit(date):
    if not request.json:
        return {"error": "Invalid body."}, 400
    
    try:
        _date = datetime.strptime(date, "%Y-%m-%d").date()
    
    except:
        return {"error": "Battle not found."}, 400

    user: User = g.user
    challenge_statistic: t.Optional[ChallengeStatistic] = ChallengeStatistic.query.filter_by(user_id=user.id, date=_date, passed=False).first()
    if not challenge_statistic:
        return {"error": "You cannot submit an answer to this challenge."}, 400

    challenge: t.Optional[Challenge] = Challenge.query.get(_date)
    if not challenge:
        return {"error": "Challenge not found."}, 400
    
    gates, wires = request.json.get("gates"), request.json.get("wires")

    if not gates or not wires:
        return {"error": "Invalid circuit."}, 400

    challenge_statistic.attempts += 1

    try:
        passed, longest_path = Simulate(
            gates, 
            wires
            ).test(json.loads(challenge.truthtable))

        gates_used = len(gates) - 5

        challenge_statistic.gates = gates_used
        challenge_statistic.longest_path = longest_path
        challenge_statistic.passed = passed

        if passed:
            challenge_statistic.finished_on = time.time()

        db.session.commit()
        return {"passed": passed}, 200

    except Exception as e:
        db.session.commit()
        return {"error": str(e)}, 400
    