from bit_battles.battles.models import Challenge, ChallengeStatistic
from bit_battles.utils.forms import validate_int

from flask_login import login_required, current_user
from datetime import datetime, timezone
from flask import Blueprint, render_template, redirect, request, flash

import string
import bleach
import json


challenges_blueprint = Blueprint("challenges", __name__, url_prefix="/app")


@challenges_blueprint.get("/daily")
@login_required
def daily():
    today = datetime.now(timezone.utc).date()
    dailies = ChallengeStatistic.query.filter(
        ChallengeStatistic.passed == True, # type: ignore
        ChallengeStatistic.date == today
    ).order_by(
        ChallengeStatistic.score.desc(), # type: ignore
        ChallengeStatistic.duration,
        ChallengeStatistic.started_on.desc() # type: ignore
    ).limit(10).all()

    dailies = [daily.leaderboard_serialize() for daily in dailies]
    return render_template("challenges/daily.html", dailies=dailies, passed=ChallengeStatistic.query.filter_by(date=today, user_id=current_user.id, passed=True).first() is not None)


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
    
    if ChallengeStatistic.query.filter_by(date=date, user_id=current_user.id, passed=True).first():
        return redirect("/app/daily")

    challenge = Challenge.get_or_create(date).serialize()
    challenge_statistic = ChallengeStatistic.get_or_create(current_user.id, date)
    challenge["started_on"] = challenge_statistic.started_on

    return render_template("challenges/challenge.html", challenge=challenge, challenge_statistic=challenge_statistic)


@challenges_blueprint.get("/challenges")
@login_required
def challenges():
    return render_template("challenges/challenges.html")


@challenges_blueprint.route("/challenge/create", methods=["GET", "POST"])
@login_required
def create_challenge():
    if request.method == "GET":
        return render_template("challenges/create_challenge.html")
    
    print(request.form)
    and_ = request.form.get("and", None, int)
    if and_:
        value, error = validate_int(and_, 0, 100)
        if error:
            flash(error, "error")
            return render_template("challenges/create_challenge.html")
    
    or_ = request.form.get("or", None, int)
    if or_:
        value, error = validate_int(or_, 0, 100)
        if error:
            flash(error, "error")
            return render_template("challenges/create_challenge.html")
    
    not_ = request.form.get("not", None, int)
    if not_:
        value, error = validate_int(not_, 0, 100)
        if error:
            flash(error, "error")
            return render_template("challenges/create_challenge.html")
    
    xor_ = request.form.get("xor", None, int)
    if xor_:
        value, error = validate_int(xor_, 0, 100)
        if error:
            flash(error, "error")
            return render_template("challenges/create_challenge.html")

    inputs = request.form.get("input-data", 1, int)
    if inputs:
        value, error = validate_int(inputs, 1, 4)

    try:
        outputs: dict = json.loads(request.form.get("output-data", "{}", str))

        for i in range(len(outputs.keys())):
            output_column = outputs.get(string.ascii_uppercase[25 - i])
            if not output_column or len(output_column) < 2 ** inputs:
                raise

            if not all(x in (0, 1) for x in output_column):
                raise                

    except:
        flash("Invalid output data", "error")
        return render_template("challenges/create_challenge.html")
        
    description = request.form.get("description", None, str)
    if description:
        description = bleach.clean(description, tags=["h2", "h3", "b", "i", "u", "s"])

    return render_template("challenges/create_challenge.html")
