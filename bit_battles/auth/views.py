from bit_battles.utils.forms import validate_string
from bit_battles.auth.models import User
from bit_battles.extensions import db

from flask_login import login_user
from flask import Blueprint, render_template, request, flash, redirect


auth_blueprint = Blueprint("auth", __name__, url_prefix="/auth")


@auth_blueprint.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("auth/register.html")

    username, error = validate_string(request.form["username"], 1, 30, "username")
    if not username:
        flash(error, 'error')
        return render_template('auth/register.html')
    
    password, error = validate_string(request.form["password"], 8, 255)
    if not password:
        flash(error, 'error')
        return render_template('auth/register.html')

    user = User(password, username)

    db.session.add(user)
    db.session.commit()
        
    login_user(user)
        
    flash('Registration successful. Welcome!', 'success')
    return redirect("/app/battles")


@auth_blueprint.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("auth/login.html")

    username = request.form['user']
    password = request.form['password']
    
    user = User.authenticate(username, password)
    if not user:
        flash(f"Invalid username or password", 'error')
        return render_template('auth/login.html')
    
    login_user(user)
    return redirect(request.args.get("next", "/app/battles"))
