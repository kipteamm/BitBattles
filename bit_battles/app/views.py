from bit_battles.utils.forms import validate_int
from bit_battles.auth.models import User
from bit_battles.app.models import Battle, Player, BattleStatistic, Challenge, ChallengeStatistic
from bit_battles.extensions import db

from collections import defaultdict
from flask_login import login_required, current_user
from datetime import datetime, timezone
from flask import Blueprint, render_template, redirect, request, make_response, flash

import typing as t


app_blueprint = Blueprint("app", __name__, url_prefix="/app")


@app_blueprint.get("/editor")
def editor():
    return render_template("app/editor.html")


@app_blueprint.get("/daily")
@login_required
def daily():
    dailies = ChallengeStatistic.query.filter(
        ChallengeStatistic.passed == True, # type: ignore
        ChallengeStatistic.date == datetime.now(timezone.utc).date()
    ).order_by(
        ChallengeStatistic.started_on.desc(), # type: ignore
        ChallengeStatistic.score.desc() # type: ignore
    ).limit(3).all()

    dailies = [daily.leaderboard_serialize() for daily in dailies]
    #dailies = sorted([daily.leaderboard_serialize() for daily in dailies], key=lambda x: x["score"], reverse=True)
    return render_template("app/daily.html", dailies=dailies)


@app_blueprint.route("/battles", methods=["GET", "POST"])
@login_required
def battles():
    if request.method == "GET":
        winners = BattleStatistic.query.filter(
                BattleStatistic.winner == True, # type: ignore
                BattleStatistic.score <= 300 # type: ignore
            ).order_by(
                BattleStatistic.creation_timestamp.desc(), # type: ignore
                BattleStatistic.score.desc() # type: ignore
            ).limit(3).all()

        winners = sorted([winner.leaderboard_serialize() for winner in winners], key=lambda x: x["score"], reverse=True)

        return render_template("app/battles.html", winners=winners)
    
    player = Player.query.filter_by(user_id=current_user.id).first()
    if player:
        return redirect(f"/app/battle/{player.battle_id}")

    battle_id = request.form["battle_id"]
    battle: t.Optional[Battle] = Battle.query.filter_by(id=battle_id, stage="queue").first()

    if not battle:
        return redirect("/app/battles")
    
    battle.players.append(current_user)
    db.session.commit()

    response = make_response(redirect(f"/app/battle/{battle.id}"))
    response.set_cookie("bt", current_user.set_battle_token())
    return response


@app_blueprint.route("/battle/new/", methods=["GET", "POST"])
@login_required
def new_battle():
    player = Player.query.filter_by(user_id=current_user.id).first()
    if player:
        return redirect(f"/app/battle/{player.battle_id}")

    if request.method == "GET":
        return render_template("app/new_battle.html")

    inputs, error = validate_int(request.form.get("inputs", 2, int), 1, 4)
    outputs, error = validate_int(request.form.get("outputs", 2, int), 1, 6)
    if not inputs or not outputs:
        flash(error, "error")
        return render_template("app/new_battle.html")
    
    gates = ["AND", "NOT", "OR"]
    if request.form.get("XOR", "off") == "on":
        gates.append("XOR")

    private = False
    if request.form.get("private", "off") == "on":
        private = True

    battle = Battle(current_user.id, inputs, outputs, gates, private)
    battle.players.append(current_user)
    db.session.add(battle)
    db.session.commit()
    
    response = make_response(redirect(f"/app/battle/{battle.id}"))
    response.set_cookie("bt", current_user.set_battle_token())
    return response


@app_blueprint.get("/battle/random/")
@login_required
def random_battle():
    player = Player.query.filter_by(user_id=current_user.id).first()
    if player:
        return redirect(f"/app/battle/{player.battle_id}")

    battle = Battle.query.filter_by(stage="queue", private=False).first()
    if not battle:
        return redirect("/app/battles")

    battle.players.append(current_user)
    db.session.commit()

    response = make_response(redirect(f"/app/battle/{battle.id}"))
    response.set_cookie("bt", current_user.set_battle_token())
    return response


@app_blueprint.get("/battle/<string:id>")
@login_required
def battle(id):
    battle: t.Optional[Battle] = Battle.query.get(id)
    if not battle:
        return redirect("/app/battles")
    
    if battle.stage != "queue":
        return redirect("/app/battles")

    player = Player.query.filter_by(battle_id=id, user_id=current_user.id).first()
    if not player:
        db.session.commit()
        battle.players.append(current_user)
    
    response = make_response(render_template(f"app/battle.html", battle=battle.serialize(), player=current_user.serialize()))
    response.set_cookie("bt", current_user.set_battle_token())
    return response


@app_blueprint.get("/user/<string:username>")
@login_required
def profile(username: str):
    if username == current_user.username:
        user = current_user
    else:
        user = User.query.filter(
            db.func.lower(User.username) == username.lower() # type: ignore
        ).first()

    if not user:
        return redirect(f"/app/user/{current_user.username}")

    battle_statistics = defaultdict(list)
        
    for battle in BattleStatistic.query.filter_by(user_id=user.id).all():
        battle_statistics[battle.battle_type].append(battle.serialize())

    return render_template("app/user.html", user=user, streak=ChallengeStatistic.get_streak(user.id), statistics=battle_statistics)


@app_blueprint.get("/challenge/daily")
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

    challenge = Challenge.get_or_create(date)
    challenge_statistic = ChallengeStatistic.get_or_create(current_user.id, date)

    return render_template("app/challenge.html", challenge=challenge.serialize(), challenge_statistic=challenge_statistic)
