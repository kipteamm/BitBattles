from bit_battles.minigames.battle import Battle, CircuitClash, Gates, manager
from bit_battles.battles.models import BattleStatistic
from bit_battles.utils.forms import validate_int
from bit_battles.auth.models import User

from flask_login import login_required, current_user
from flask import Blueprint, render_template, redirect, request, make_response, flash

import typing as t
import random


battle_blueprint = Blueprint("battles", __name__, url_prefix="/app")


@battle_blueprint.route("/battles", methods=["GET", "POST"])
@login_required
def battles():
    user: User = current_user # type: ignore

    if request.method == "GET":
        winners = BattleStatistic.query.filter(
                BattleStatistic.winner == True, # type: ignore
                BattleStatistic.score <= 300 # type: ignore
            ).order_by(
                BattleStatistic.creation_timestamp.desc(), # type: ignore
                BattleStatistic.score.desc() # type: ignore
            ).limit(3).all()

        winners = sorted([winner.leaderboard_serialize() for winner in winners], key=lambda x: x["score"], reverse=True)

        return render_template("battles/battles.html", winners=winners, battles=len(manager.get_public()))
    
    player = manager.get_player(user.id)
    if player:
        return redirect(f"/app/battle/{player.battle.id}")

    battle_id = request.form["battle_id"]
    battle: t.Optional[Battle] = manager.get_battle(battle_id)

    if not battle:
        return redirect("/app/battles")
    
    battle.add_player(user)

    response = make_response(redirect(f"/app/battle/{battle.id}"))
    response.set_cookie("bt", user.set_battle_token())
    return response


@battle_blueprint.route("/battle/new/", methods=["GET", "POST"])
@login_required
def new_battle():
    user: User = current_user # type: ignore
    player = manager.get_player(user.id)

    if player:
        return redirect(f"/app/battle/{player.battle.id}")

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

    battle = CircuitClash(user.id, private, inputs, outputs, [getattr(Gates, gate) for gate in gates])
    battle.add_player(user)
    
    response = make_response(redirect(location=f"/app/battle/{battle.id}"))
    response.set_cookie("bt", user.set_battle_token())
    return response


@battle_blueprint.get("/battle/random/")
@login_required
def random_battle():
    user: User = current_user # type: ignore
    player = manager.get_player(user.id)

    if player:
        return redirect(f"/app/battle/{player.battle.id}")
    
    if not manager.get_public():
        return redirect("/app/battles")

    battle = random.choice(manager.get_public())
    battle.add_player(user)

    response = make_response(redirect(f"/app/battle/{battle.id}"))
    response.set_cookie("bt", user.set_battle_token())
    return response


@battle_blueprint.get("/battle/<string:id>")
@login_required
def battle(id):
    user: User = current_user # type: ignore
    battle: t.Optional[Battle] = manager.get_battle(id)

    if not battle:
        return redirect("/app/battles")
    
    if battle.stage != "queue":
        return redirect("/app/battles")

    player = manager.get_player(user.id)
    if not player:     
        battle.add_player(user)
    
    response = make_response(render_template(f"battles/battle.html", battle=battle.serialize("id", "players", "truthtable", "stage"), user=user.serialize()))
    response.set_cookie("bt", user.set_battle_token())
    return response
