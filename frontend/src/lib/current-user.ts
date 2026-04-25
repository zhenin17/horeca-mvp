export type ActiveRole = "candidate" | "employer";

export type CurrentUserRead = {
  telegram_user_id: number;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  candidate_id: number | null;
  employer_id: number | null;
  is_candidate: boolean;
  is_employer: boolean;
  is_admin: boolean;
};

const ACTIVE_ROLE_STORAGE_KEY = "hubsty_active_role";
const CANDIDATE_ID_STORAGE_KEY = "hubsty_candidate_id";
const EMPLOYER_ID_STORAGE_KEY = "hubsty_employer_id";

function readPositiveNumber(value: string | null): number | null {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function getActiveRole(): ActiveRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const savedRole = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY);
  return savedRole === "candidate" || savedRole === "employer" ? savedRole : null;
}

export function setActiveRole(role: ActiveRole) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, role);
}

export function clearActiveRole() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_ROLE_STORAGE_KEY);
}

export function syncLegacyIdsFromCurrentUser(currentUser: CurrentUserRead) {
  if (typeof window === "undefined") {
    return;
  }

  if (currentUser.candidate_id) {
    window.localStorage.setItem(
      CANDIDATE_ID_STORAGE_KEY,
      String(currentUser.candidate_id)
    );
  } else {
    window.localStorage.removeItem(CANDIDATE_ID_STORAGE_KEY);
  }

  if (currentUser.employer_id) {
    window.localStorage.setItem(
      EMPLOYER_ID_STORAGE_KEY,
      String(currentUser.employer_id)
    );
  } else {
    window.localStorage.removeItem(EMPLOYER_ID_STORAGE_KEY);
  }
}

export function clearLegacyIds() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CANDIDATE_ID_STORAGE_KEY);
  window.localStorage.removeItem(EMPLOYER_ID_STORAGE_KEY);
}

export function getCurrentCandidateId() {
  if (typeof window === "undefined") {
    return 1;
  }

  const possibleKeys = [
    "hubsty_candidate_id",
    "candidateId",
    "selectedCandidateId",
  ];

  for (const key of possibleKeys) {
    const id = readPositiveNumber(window.localStorage.getItem(key));
    if (id) {
      return id;
    }
  }

  return 1;
}

export function getCurrentEmployerId() {
  if (typeof window === "undefined") {
    return 1;
  }

  const possibleKeys = [
    "hubsty_employer_id",
    "employerId",
    "selectedEmployerId",
  ];

  for (const key of possibleKeys) {
    const id = readPositiveNumber(window.localStorage.getItem(key));
    if (id) {
      return id;
    }
  }

  return 1;
}