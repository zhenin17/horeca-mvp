export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}