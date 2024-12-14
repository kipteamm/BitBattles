from bit_battles.challenges.models import DailyChallenge, DailyChallengeStatistic, Challenge, ChallengeStatistic
from bit_battles.utils.forms import validate_int
from bit_battles.extensions import db

from flask_login import login_required, current_user
from datetime import datetime, timezone
from flask import Blueprint, render_template, redirect, request, flash

import typing as t
import string
import bleach
import json


challenges_blueprint = Blueprint("challenges", __name__, url_prefix="/app")


@challenges_blueprint.get("/daily")
@login_required
def daily():
    today = datetime.now(timezone.utc).date()
    dailies = DailyChallengeStatistic.query.filter(
        DailyChallengeStatistic.passed == True, # type: ignore
        DailyChallengeStatistic.date == today
    ).order_by(
        DailyChallengeStatistic.score.desc(), # type: ignore
        DailyChallengeStatistic.duration,
        DailyChallengeStatistic.started_on.desc() # type: ignore
    ).limit(10).all()

    dailies = [daily.leaderboard_serialize() for daily in dailies]
    return render_template("challenges/daily.html", dailies=dailies, passed=DailyChallengeStatistic.query.filter_by(date=today, user_id=current_user.id, passed=True).first() is not None)


@challenges_blueprint.get("/challenge/daily")
@login_required
def daily_challenge():
    today = datetime.now(timezone.utc).date()
    date = request.args.get("date")

    if date:
        try:
            date = datetime.strptime(date, '%Y-%m-%d').date()
        except ValueError:
            return redirect("/app/daily")
    else:
        date = today

    if date > today:
        return redirect("/app/daily")
    
    if DailyChallengeStatistic.query.filter_by(date=date, user_id=current_user.id, passed=True).first():
        return redirect("/app/daily")

    challenge = DailyChallenge.get_or_create(date).serialize()
    challenge_statistic = DailyChallengeStatistic.get_or_create(current_user.id, date)
    challenge["started_on"] = challenge_statistic.started_on

    return render_template("challenges/daily_challenge.html", challenge=challenge, challenge_statistic=challenge_statistic)


@challenges_blueprint.get("/challenges")
@login_required
def challenges():
    challenges = Challenge.query.all()
    return render_template("challenges/challenges.html", challenges=challenges)


@challenges_blueprint.route("/challenge/<string:id>", methods=["GET"])
@login_required
def challenge(id: str):
    challenge: t.Optional[Challenge] = Challenge.query.get(id)
    if not challenge:
        return redirect("/app/challenges")

    challenge_data = challenge.serialize()
    challenge_statistic = ChallengeStatistic.get_or_create(current_user.id, challenge.id)
    challenge_data["started_on"] = challenge_statistic.started_on
    challenge_data["passed"] = challenge_statistic.passed
    challenge_data["rated"] = challenge_statistic.rated

    return render_template("challenges/challenge.html", challenge=challenge_data)


@challenges_blueprint.route("/challenge/create", methods=["GET", "POST"])
@login_required
def create_challenge():
    challenge = Challenge(current_user.id)
    db.session.add(challenge)
    db.session.commit()

    return redirect(f"/app/challenge/{challenge.id}/edit")


@challenges_blueprint.route("/challenge/<string:id>/edit", methods=["GET", "POST"])
@login_required
def edit_challenge(id: str):
    challenge: t.Optional[Challenge] = Challenge.query.get(id)
    if not challenge:
        return redirect("/app/challenges")

    if request.method == "GET":
        return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
    
    name = request.form.get("name", None, str)
    if name:
        challenge.name = name

    and_ = request.form.get("and", None, int)
    if and_:
        value, error = validate_int(and_, 0, 100)
        if not value:
            flash(error, "error")
            return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
    challenge.and_gates = and_
    
    or_ = request.form.get("or", None, int)
    if or_:
        value, error = validate_int(or_, 0, 100)
        if not value:
            flash(error, "error")
            return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
    challenge.or_gates = or_
    
    not_ = request.form.get("not", None, int)
    if not_:
        value, error = validate_int(not_, 0, 100)
        if not value:
            flash(error, "error")
            return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
    challenge.not_gates = not_
    
    xor = request.form.get("xor", None, int)
    if xor:
        value, error = validate_int(xor, 0, 100)
        if not value:
            flash(error, "error")
            return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
    challenge.xor_gates = xor

    inputs = request.form.get("input-data", 1, int)
    if inputs:
        value, error = validate_int(inputs, 1, 4)
        if not value:
            flash(error, "error")
            return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
    challenge.inputs = inputs

    try:
        outputs: dict = json.loads(request.form.get("output-data", "{}", str))

        if len(outputs.keys()) > 12:
            flash("Maximum amount of outputs exceeded.", "error")
            return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())


        for i in range(len(outputs.keys())):
            output_column = outputs.get(string.ascii_uppercase[25 - i])
            if not output_column or len(output_column) < 2 ** inputs:
                raise

            if not all(x in (0, 1) for x in output_column):
                raise

    except:
        flash("Invalid output data", "error")
        return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
        
    challenge.set_truthtable(inputs, outputs)

    description = request.form.get("description", None, str)
    if description:
        description = bleach.clean(description, tags=["h2", "h3", "b", "i", "u", "s", "p", "circuit"])
    challenge.description = description

    db.session.commit()

    return render_template("challenges/edit_challenge.html", challenge=challenge.edit_serialize())
