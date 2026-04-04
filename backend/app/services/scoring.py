from app.models.candidate import Candidate
from app.models.vacancy import Vacancy


def calculate_candidate_profile_score(candidate: Candidate) -> int:
    score = 0

    # опыт в HoReCa
    if candidate.horeca_experience_months >= 12:
        score += 25
    elif candidate.horeca_experience_months >= 6:
        score += 18
    elif candidate.horeca_experience_months >= 3:
        score += 10
    elif candidate.horeca_experience_months > 0:
        score += 5

    # готовность выйти
    ready = candidate.ready_to_start.lower()
    if ready in {"today", "сегодня"}:
        score += 20
    elif ready in {"tomorrow", "завтра"}:
        score += 16
    elif ready in {"3days", "3_days", "3 дня"}:
        score += 10
    elif ready in {"week", "неделя"}:
        score += 5

    # заполненность профиля
    if candidate.telegram_username:
        score += 5
    if candidate.district:
        score += 5
    if candidate.expected_income:
        score += 5

    # активность
    if candidate.is_active:
        score += 10

    # базовая роль
    if candidate.primary_role:
        score += 10

    return min(score, 100)


def calculate_vacancy_match_score(candidate: Candidate, vacancy: Vacancy) -> int:
    score = 0

    # совпадение роли
    if candidate.primary_role.strip().lower() == vacancy.role.strip().lower():
        score += 40

    # совпадение города
    if candidate.city.strip().lower() == vacancy.city.strip().lower():
        score += 20

    # совпадение района
    if candidate.district and vacancy.district:
        if candidate.district.strip().lower() == vacancy.district.strip().lower():
            score += 15

    # готовность выйти
    ready = candidate.ready_to_start.lower()
    needed = (vacancy.needed_start or "").lower()

    if ready and needed:
        if ready == needed:
            score += 15
        elif ready in {"today", "tomorrow", "сегодня", "завтра"}:
            score += 10

    # опыт
    if candidate.horeca_experience_months >= 12:
        score += 10
    elif candidate.horeca_experience_months >= 3:
        score += 5

    return min(score, 100)


def calculate_final_match_score(candidate: Candidate, vacancy: Vacancy) -> int:
    profile_score = calculate_candidate_profile_score(candidate)
    vacancy_score = calculate_vacancy_match_score(candidate, vacancy)

    final_score = round(profile_score * 0.4 + vacancy_score * 0.6)
    return min(final_score, 100)