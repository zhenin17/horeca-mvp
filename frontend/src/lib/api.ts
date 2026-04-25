const ACCESS_TOKEN_STORAGE_KEY = "hubsty_access_token";

function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/api${normalizedPath}`;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
}

async function readErrorMessage(response: Response) {
  let message = `API request failed: ${response.status}`;

  try {
    const text = await response.text();

    if (!text.trim()) {
      return message;
    }

    try {
      const data = JSON.parse(text) as { detail?: string; message?: string };
      return data.detail || data.message || text || message;
    } catch {
      return text;
    }
  } catch {
    return message;
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    cache: "no-store",
    ...init,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }

    throw new Error(await readErrorMessage(response));
  }

  const text = await response.text();

  if (!text.trim()) {
    return null as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null as T;
  }
}

export async function apiFetch<T>(path: string): Promise<T> {
  return apiRequest<T>(path, {
    method: "GET",
  });
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function apiPatchJson<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function apiPostFormData<T>(
  path: string,
  formData: FormData
): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: formData,
  });
}

export async function uploadVacancyPhoto<T = unknown>(
  vacancyId: number,
  file: File
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  return apiPostFormData<T>(`/vacancies/${vacancyId}/photos/upload`, formData);
}

export async function uploadCandidatePhoto<T = unknown>(
  candidateId: number,
  file: File
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  return apiPostFormData<T>(`/candidates/${candidateId}/photos/upload`, formData);
}

export function normalizeMediaUrl(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/api/")) {
    return url;
  }

  if (url.startsWith("/uploads/")) {
    return `/api${url}`;
  }

  if (url.startsWith("/")) {
    return url;
  }

  return `/api/${url}`;
}