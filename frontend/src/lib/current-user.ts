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
  is_moderator: boolean;
  is_support: boolean;
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

export function getCurrentCandidateId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const possibleKeys = [
    CANDIDATE_ID_STORAGE_KEY,
    "candidateId",
    "selectedCandidateId",
  ];

  for (const key of possibleKeys) {
    const id = readPositiveNumber(window.localStorage.getItem(key));
    if (id) {
      return id;
    }
  }

  return null;
}

export function getCurrentEmployerId(): number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const possibleKeys = [
    EMPLOYER_ID_STORAGE_KEY,
    "employerId",
    "selectedEmployerId",
  ];

  for (const key of possibleKeys) {
    const id = readPositiveNumber(window.localStorage.getItem(key));
    if (id) {
      return id;
    }
  }

  return null;
}

export function isStaffUser(currentUser: CurrentUserRead | null): boolean {
  if (!currentUser) {
    return false;
  }

  return Boolean(
    currentUser.is_admin ||
      currentUser.is_moderator ||
      currentUser.is_support
  );
}

export function getStaffRoleLabel(currentUser: CurrentUserRead | null): string | null {
  if (!currentUser) {
    return null;
  }

  if (currentUser.is_admin) {
    return "admin";
  }

  if (currentUser.is_moderator) {
    return "moderator";
  }

  if (currentUser.is_support) {
    return "support";
  }

  return null;
}