from bit_battles.api.challenge.views import challenge_api_blueprint
from bit_battles.challenges.views import challenges_blueprint 
from bit_battles.api.battle.views import battle_api_blueprint
from bit_battles.circuits.views import circuits_blueprint 
from bit_battles.battles.events import register_events
from bit_battles.battles.models import Battle, Player
from bit_battles.battles.views import battle_blueprint
from bit_battles.auth.models import User
from bit_battles.main.views import main_blueprint
from bit_battles.auth.views import auth_blueprint
from bit_battles.app.views import app_blueprint

from .extensions import db, socketio
from .secrets import SECRET_KEY
from .config import DEBUG

from flask_migrate import Migrate
from flask_login import LoginManager, current_user, AnonymousUserMixin
from flask import Flask, request, redirect

import typing as t


def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/static")

    app.register_blueprint(challenge_api_blueprint)
    app.register_blueprint(battle_api_blueprint)
    app.register_blueprint(challenges_blueprint)
    app.register_blueprint(circuits_blueprint)
    app.register_blueprint(battle_blueprint)
    app.register_blueprint(main_blueprint)
    app.register_blueprint(auth_blueprint)
    app.register_blueprint(app_blueprint)

    register_events(socketio)

    app.config["DEBUG"] = DEBUG
    app.config["SECRET_KEY"] = SECRET_KEY
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./db.sqlite3"

    login_manager = LoginManager(app)
    migrate = Migrate()

    socketio.init_app(app)
    migrate.init_app(app, db)
    db.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(user_id)

    @login_manager.unauthorized_handler
    def unauthorized():
        next = request.args.get('next')
        
        if not next:
            next = request.path
            
        return redirect(f'/auth/login?next={next}')

    @socketio.on('disconnect')
    def handle_disconnect():
        if isinstance(current_user, AnonymousUserMixin):
            return

        player: t.Optional[Player] = Player.query.filter_by(user_id=current_user.id).first()
        if not player:
            return

        battle: t.Optional[Battle] = Battle.query.get(player.battle_id)
        if not battle:
            return
        
        if battle.owner_id == current_user.id:  
            db.session.delete(battle)
            socketio.emit("disband", to=battle.id)
        else:
            battle.players.remove(current_user)
            socketio.emit("player_leave", {"id": current_user.id}, to=battle.id)
        
        db.session.commit()

    return app