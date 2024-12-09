from bit_battles.battles.models import Challenge, ChallengeStatistic

from flask_login import login_required, current_user
from datetime import datetime, timezone
from flask import Blueprint, render_template, redirect, request


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


@challenges_blueprint.get("/challenge/create")
@login_required
def create_challenge():
    return render_template("challenges/create_challenge.html")
