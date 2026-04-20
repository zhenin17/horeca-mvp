from app.models.funnel_event import FunnelEvent


def calculate_candidate_reliability(events: list[FunnelEvent]) -> dict:
    worked_count = len([e for e in events if e.event_type == "shift_worked"])
    no_show_count = len([e for e in events if e.event_type == "shift_no_show"])
    cancelled_count = len([e for e in events if e.event_type == "shift_cancelled"])

    score = 50
    score += worked_count * 10
    score -= no_show_count * 20
    score -= cancelled_count * 5

    if score < 0:
        score = 0
    if score > 100:
        score = 100

    return {
        "score": score,
        "worked_count": worked_count,
        "no_show_count": no_show_count,
        "cancelled_count": cancelled_count,
    }