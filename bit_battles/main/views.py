from flask import Blueprint, render_template


main_blueprint = Blueprint("main", __name__)


@main_blueprint.get("/")
def index():
    return render_template("main/index.html")


@main_blueprint.get("/editor")
def editor():
    return render_template("main/editor.html")
