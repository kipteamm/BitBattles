from bit_battles.utils.functions import get_back_url
from bit_battles.utils.circuit import Circuit
from bit_battles.auth.models import User
from bit_battles.app.models import Battle, Player, BattleStatistic, Challenge, ChallengeStatistic
from bit_battles.extensions import db

from collections import defaultdict
from flask_login import login_required, current_user
from datetime import datetime, timezone
from flask import Blueprint, render_template, redirect, request, make_response, flash

import typing as t


circuits_blueprint = Blueprint("circuits", __name__, url_prefix="/app/circuit")


@circuits_blueprint.get("/daily/<string:id>")
@login_required
def daily_circuits(id):
    success, circuit = Circuit.load("daily", id)
    if not success:
        return redirect(get_back_url(request))
    
    if not ChallengeStatistic.query.filter_by(user_id=current_user.id, date=circuit["daily_id"], passed=True).first():
        return redirect(get_back_url(request))

    return render_template("circuits/circuit.html", circuit=circuit["circuit"])
