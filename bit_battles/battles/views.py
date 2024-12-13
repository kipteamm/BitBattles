from bit_battles.battles.models import Battle, Player, BattleStatistic
from bit_battles.utils.forms import validate_int
from bit_battles.extensions import db

from flask_login import login_required, current_user
from flask import Blueprint, render_template, redirect, request, make_response, flash

import typing as t


battle_blueprint = Blueprint("battles", __name__, url_prefix="/app")


@battle_blueprint.route("/battles", methods=["GET", "POST"])
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

        return render_template("battles/battles.html", winners=winners)
    
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


@battle_blueprint.route("/battle/new/", methods=["GET", "POST"])
@login_required
def new_battle():
    player = Player.query.filter_by(user_id=current_user.id).first()
    if player:
        return redirect(f"/app/battle/{player.battle_id}")

    if request.method == "GET":
        return render_template("battles/new_battle.html")

    inputs, error = validate_int(request.form.get("inputs", 2, int), 1, 4)
    outputs, error = validate_int(request.form.get("outputs", 2, int), 1, 6)
    if not inputs or not outputs:
        flash(error, "error")
        return render_template("battles/new_battle.html")
    
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


@battle_blueprint.get("/battle/random/")
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


@battle_blueprint.get("/battle/<string:id>")
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
    
    response = make_response(render_template(f"battles/battle.html", battle=battle.serialize(), player=current_user.serialize()))
    response.set_cookie("bt", current_user.set_battle_token())
    return response
