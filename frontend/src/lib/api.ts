export async function apiFetch<T>(path: string): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`/api${normalizedPath}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const data = (await response.json()) as { detail?: string; message?: string };
      message = data.detail || data.message || message;
    } catch {
      // ignore json parse errors
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function apiPostFormData<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`/api${normalizedPath}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const text = await response.text();

      if (text.trim()) {
        try {
          const data = JSON.parse(text) as { detail?: string; message?: string };
          message = data.detail || data.message || text || message;
        } catch {
          message = text;
        }
      }
    } catch {
      // ignore body read errors
    }

    throw new Error(message);
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