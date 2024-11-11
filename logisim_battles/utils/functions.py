from urllib import parse
from flask import Request


def get_back_url(request: Request) -> str:
    back = parse.urlparse(request.referrer).path

    return back if back else '/app/battles'
