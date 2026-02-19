from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any

from models import Match


@dataclass
class AnalyticsResult:
    summary: dict[str, Any]


def _minute_band(minute: int) -> str:
    if minute <= 30:
        return "0-30"
    if minute <= 60:
        return "31-60"
    if minute <= 90:
        return "61-90"
    return "91-120"


def _zone(x: float, y: float) -> str:
    vertical = "izquierda" if x < 33.33 else "centro" if x < 66.66 else "derecha"
    horizontal = "defensiva" if y < 33.33 else "media" if y < 66.66 else "ofensiva"
    return f"{horizontal}-{vertical}"


def _counter_to_percent(counter: Counter[str], total: int) -> dict[str, float]:
    if total == 0:
        return {}
    return {k: round((v / total) * 100, 1) for k, v in counter.items()}


def build_analytics(matches: list[Match]) -> AnalyticsResult:
    total_matches = len(matches)
    goals_for = sum(m.goals_for for m in matches)
    goals_against = sum(m.goals_against for m in matches)

    play_type_for: Counter[str] = Counter()
    play_type_against: Counter[str] = Counter()
    minute_for: Counter[str] = Counter()
    minute_against: Counter[str] = Counter()
    zone_for: Counter[str] = Counter()
    zone_against: Counter[str] = Counter()

    total_events_for = 0
    total_events_against = 0

    for match in matches:
        for event in match.goal_events:
            band = _minute_band(event.minute)
            zone = _zone(event.x, event.y)

            if event.for_or_against == "for":
                total_events_for += 1
                play_type_for[event.play_type] += 1
                minute_for[band] += 1
                zone_for[zone] += 1
            else:
                total_events_against += 1
                play_type_against[event.play_type] += 1
                minute_against[band] += 1
                zone_against[zone] += 1

    summary = {
        "matches_count": total_matches,
        "score_totals": {
            "goals_for": goals_for,
            "goals_against": goals_against,
            "goal_difference": goals_for - goals_against,
            "avg_for": round(goals_for / total_matches, 2) if total_matches else 0,
            "avg_against": round(goals_against / total_matches, 2) if total_matches else 0,
        },
        "events_count": {
            "for": total_events_for,
            "against": total_events_against,
        },
        "percent_against_by_play_type": _counter_to_percent(play_type_against, total_events_against),
        "percent_for_by_play_type": _counter_to_percent(play_type_for, total_events_for),
        "percent_against_by_minute_band": _counter_to_percent(minute_against, total_events_against),
        "percent_for_by_minute_band": _counter_to_percent(minute_for, total_events_for),
        "percent_against_by_zone": _counter_to_percent(zone_against, total_events_against),
        "percent_for_by_zone": _counter_to_percent(zone_for, total_events_for),
        "raw_counts": {
            "against_play_type": dict(play_type_against),
            "for_play_type": dict(play_type_for),
            "against_minute_band": dict(minute_against),
            "for_minute_band": dict(minute_for),
            "against_zone": dict(zone_against),
            "for_zone": dict(zone_for),
        },
    }

    return AnalyticsResult(summary=summary)
