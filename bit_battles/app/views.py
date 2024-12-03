from bit_battles.battles.models import BattleStatistic, ChallengeStatistic
from bit_battles.auth.models import User
from bit_battles.extensions import db

from collections import defaultdict
from flask_login import login_required, current_user
from flask import Blueprint, render_template, redirect

import json


app_blueprint = Blueprint("app", __name__, url_prefix="/app")


@app_blueprint.get("/editor")
def editor():
    return render_template("app/editor.html")


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
        
    for battle in BattleStatistic.query.filter_by(user_id=user.id).order_by(BattleStatistic.creation_timestamp.desc()).all():
        name = battle.battle_type.split("-")
        if "[" in name[2]:
            battle.battle_type = f"{name[0]}-{name[1]}-{','.join(json.loads(name[2]))}"
        battle_statistics[f"Inputs: {name[0]} Outputs: {name[1]} Gates: {name[2].replace(',', ', ')}"].append(battle.serialize())

    db.session.commit()

    return render_template("app/user.html", user=user, streak=ChallengeStatistic.get_streak(user.id), statistics=battle_statistics)
