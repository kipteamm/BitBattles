from bit_battles.challenges.models import DailyChallengeStatistic
from bit_battles.extensions import db, cache

from sqlalchemy import func
from datetime import date


def get_daily_leaderboard(date: date) -> list:
    cache_key = f"daily:{date.strftime('%Y-%m-%d')}"
    data = cache.get(cache_key)
    if data:
        return data

    filtered_stats = db.session.query(DailyChallengeStatistic).filter(
        DailyChallengeStatistic.date == date,
        DailyChallengeStatistic.passed == True
    )

    metrics = (
        filtered_stats.with_entities(
            func.min(DailyChallengeStatistic.longest_path),
            func.min(DailyChallengeStatistic.gates),
            func.max(DailyChallengeStatistic.duration)
        ).first()
    )

    if not metrics:
        return []

    shortest_path, least_gates, longest_duration = metrics

    users = filtered_stats.all()
    users_with_scores = [
        {
            "user": user,
            "score": round(
                (shortest_path / max(user.longest_path, 1))
                + (least_gates / max(user.gates, 1))
                + (longest_duration / max(user.duration, 1))
            ),
        }
        for user in users
    ]

    top_users = sorted(
        users_with_scores,
        key=lambda x: (-x['score'], x['user'].duration, -x['user'].started_on)
    )[:10]
    data = [user['user'].leaderboard_serialize() for user in top_users]

    cache.set(cache_key, data, 14400)
    return data
