from bit_battles.challenges.models import DailyChallengeStatistic, ChallengeStatistic, DailyChallenge, Challenge
from bit_battles.utils.functions import get_back_url
from bit_battles.utils.circuit import Circuit

from flask_login import login_required, current_user
from flask import Blueprint, render_template, redirect, request

import typing as t
import json


circuits_blueprint = Blueprint("circuits", __name__, url_prefix="/app/circuit")


@circuits_blueprint.get("/daily/<string:id>")
@login_required
def daily_circuits(id):
    success, circuit = Circuit.load("daily", id)
    if not success:
        return redirect(get_back_url(request))
    
    if not DailyChallengeStatistic.query.filter_by(user_id=current_user.id, date=circuit["daily_id"], passed=True).first():
        return redirect(get_back_url(request))

    daily_challenge: t.Optional[DailyChallenge] = DailyChallenge.query.filter_by(date=circuit["daily_id"]).first()
    if not daily_challenge:
        return redirect(get_back_url(request))
    
    return render_template("circuits/circuit.html", circuit=circuit["circuit"], truthtable=json.loads(daily_challenge.truthtable))


@circuits_blueprint.get("/challenge/<string:id>")
@login_required
def challenge_circuits(id):
    success, circuit = Circuit.load("challenge", id)
    if not success:
        return redirect(get_back_url(request))
    
    if not ChallengeStatistic.query.filter_by(user_id=current_user.id, challenge_id=circuit["challenge_id"], passed=True).first():
        return redirect(get_back_url(request))
    
    challenge: t.Optional[Challenge] = Challenge.query.get(circuit["challenge_id"])
    if not challenge:
        return redirect(get_back_url(request))

    return render_template("circuits/circuit.html", circuit=circuit["circuit"], truthtable=json.loads(challenge.truthtable))
