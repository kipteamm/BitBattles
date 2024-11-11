from flask_login import login_required
from flask import Blueprint, render_template


app_blueprint = Blueprint("app", __name__, url_prefix="/app")


@app_blueprint.get("/play")
@login_required
def play():
    return render_template("app/play.html")


@app_blueprint.get("/profile")
@login_required
def profile():
    return render_template("app/profile.html")
