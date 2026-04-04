from app.models.vacancy_candidate_match import VacancyCandidateMatch


def calculate_candidate_reliability(matches: list[VacancyCandidateMatch]) -> dict:
    total_matches = len(matches)
    invited_count = len([m for m in matches if m.status == "invited"])
    interviewed_count = len([m for m in matches if m.status == "interviewed"])
    hired_count = len([m for m in matches if m.status == "hired"])
    rejected_count = len([m for m in matches if m.status == "rejected"])
    no_show_count = len([m for m in matches if m.status == "no_show"])

    score = 50
    score += invited_count * 5
    score += interviewed_count * 10
    score += hired_count * 20
    score -= rejected_count * 3
    score -= no_show_count * 20

    if score < 0:
        score = 0
    if score > 100:
        score = 100

    return {
        "total_matches": total_matches,
        "invited_count": invited_count,
        "interviewed_count": interviewed_count,
        "hired_count": hired_count,
        "rejected_count": rejected_count,
        "no_show_count": no_show_count,
        "reliability_score": score,
    }