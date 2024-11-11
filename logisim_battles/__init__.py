from logisim_battles.utils.functions import get_back_url
from logisim_battles.auth.models import User
from logisim_battles.main.views import main_blueprint
from logisim_battles.auth.views import auth_blueprint
from logisim_battles.app.views import app_blueprint

from .extensions import db, socketio
from .secrets import SECRET_KEY
from .config import DEBUG

from flask_migrate import Migrate
from flask_login import LoginManager
from flask import Flask, request, redirect



def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/static")

    app.register_blueprint(main_blueprint)
    app.register_blueprint(auth_blueprint)
    app.register_blueprint(app_blueprint)
    
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
            next = get_back_url(request=request)
            
        return redirect(f'/auth/login?next={next}')


    return app