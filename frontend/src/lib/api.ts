const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://195.133.30.228";

export async function apiFetch<T>(path: string): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE_URL}/api${normalizedPath}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}