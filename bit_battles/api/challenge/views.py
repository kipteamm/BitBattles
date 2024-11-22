from bit_battles.utils.decorators import user_authorized
from bit_battles.utils.battle import Simulate
from bit_battles.auth.models import User
from bit_battles.app.models import ChallengeStatistic, Challenge
from bit_battles.extensions import db

from sqlalchemy import func
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
            challenge_statistic.duration = time.time() - challenge_statistic.started_on
            challenge_statistic.set_score()

        db.session.commit()
        return {"passed": challenge_statistic.passed}, 200

    except Exception as e:
        db.session.commit()
        return {"error": str(e)}, 400
    

@challenge_api_blueprint.get("/challenge/<string:date>/results")
@user_authorized
def results(date):
    try:
        _date = datetime.strptime(date, "%Y-%m-%d").date()
    
    except:
        return {"error": "Battle not found."}, 400
    
    user: User = g.user
    challenge_statistic: t.Optional[ChallengeStatistic] = ChallengeStatistic.query.filter_by(user_id=user.id, date=_date, passed=True).first()
    if not challenge_statistic:
        return {"error": "You don't have any results for this challenge."}, 400

    challenge: t.Optional[Challenge] = Challenge.query.get(_date)
    if not challenge:
        return {"error": "Challenge not found."}, 400
    
    average = db.session.query(
        func.avg(ChallengeStatistic.gates).label("gates"),
        func.avg(ChallengeStatistic.longest_path).label("longest_path"),
        func.avg(ChallengeStatistic.duration).label("duration")
    ).filter_by(date=_date, passed=True).first()

    if not average:
        return {
            "user": challenge_statistic.serialize(),
            "average_gates": challenge_statistic.gates, 
            "average_longest_path": challenge_statistic.longest_path,
            "average_duration": challenge_statistic.longest_path
        }
        
    return {
        "user": challenge_statistic.serialize(),
        "average_gates": average.gates,
        "average_longest_path": average.longest_path,
        "average_duration": average.duration
    }
    