from logisim_battles.app.models import Battle
from logisim_battles.extensions import db

from flask_login import login_required, current_user
from flask import Blueprint, render_template, redirect


app_blueprint = Blueprint("app", __name__, url_prefix="/app")


@app_blueprint.get("/battle")
@login_required
def battle():
    return render_template("app/battle.html")


@app_blueprint.get("/battle/start/")
@login_required
def start_battle():
    battle = Battle.query.filter_by(owner_id=current_user).first()
    if battle:
        db.session.delete(battle)

    #if Player.query.filter_by(user_id=current_user.id).first():

    battle = Battle(current_user.id)
    battle.players.add(current_user)
    
    db.session.add(battle)
    db.session.commit()

    return redirect(f"/app/battle/{battle.id}")


@app_blueprint.get("/profile")
@login_required
def profile():
    return render_template("app/profile.html")
