from flask import Blueprint, render_template, redirect


main_blueprint = Blueprint("main", __name__)


@main_blueprint.get("/")
def index():
    return redirect("/app/battles")
