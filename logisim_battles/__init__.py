from .secrets import SECRET_KEY
from .config import DEBUG

from logisim_battles.main.views import main_blueprint

from flask import Flask



def create_app() -> Flask:
    app = Flask(__name__, static_folder="static", static_url_path="/static")

    app.register_blueprint(main_blueprint)
    
    app.config["DEBUG"] = DEBUG
    app.config["SECRET_KEY"] = SECRET_KEY

    return app