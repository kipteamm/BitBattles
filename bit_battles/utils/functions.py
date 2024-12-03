from urllib import parse
from flask import Request

import time


def get_back_url(request: Request) -> str:
    back = parse.urlparse(request.referrer).path

    return back if back else '/app/battles'


def relative_timestamp(timestamp: float) -> str:
    time_difference = time.time() - timestamp
    
    if time_difference < 60:
        return "Just now"
    elif time_difference < 3600:
        minutes = time_difference // 60
        return f"{int(minutes)} minute{'s' if minutes != 1 else ''} ago"
    elif time_difference < 86400:
        hours = time_difference // 3600
        return f"{int(hours)} hour{'s' if hours != 1 else ''} ago"
    elif time_difference < 2620800:
        days = time_difference // 86400
        return f"{int(days)} day{'s' if days != 1 else ''} ago"
    elif time_difference < 31449600:
        months = time_difference // 2620800
        return f"{int(months)} month{'s' if months != 1 else ''} ago"
    else:
        years = time_difference // 31449600
        return f"{int(years)} year{'s' if years != 1 else ''} ago"
