const getApiBase = () => {
  const env = import.meta.env.VITE_API_URL;
  if (env) return env.replace(/\/$/, "");
  return "";
};

export interface RecipeIngredient {
  quantity?: number;
  unit?: string;
  item: string;
  aisle?: string;
}

export interface RecipeStep {
  order: number;
  instruction: string;
}

export interface MiseEnPlace {
  ingredient: string;
  technique: string;
  quantity?: string;
}

export interface Recipe {
  title: string;
  source_url: string;
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  mise_en_place?: MiseEnPlace[];
}

export interface JobStatusResponse {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  url: string;
  error?: string;
  permanent?: boolean;
  recipe?: Recipe;
}

export async function importRecipe(
  url: string,
  idToken: string
): Promise<{ jobId: string }> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/import-recipe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      (data as { error?: string }).error ?? `Erro ${res.status}`;
    throw new Error(message);
  }

  const data = (await res.json()) as { jobId: string };
  return data;
}

export async function fetchJobStatus(
  jobId: string,
  idToken: string
): Promise<JobStatusResponse> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/job-status?jobId=${encodeURIComponent(jobId)}`,
    {
      headers: { Authorization: `Bearer ${idToken}` },
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Erro ${res.status}`);
  }

  return (await res.json()) as JobStatusResponse;
}

export function pollJobStatus(
  jobId: string,
  getToken: () => Promise<string>,
  onUpdate: (data: JobStatusResponse) => void,
  onError: (err: Error) => void,
  intervalMs = 3000
): () => void {
  let stopped = false;
  let timeoutId: ReturnType<typeof setTimeout>;

  async function tick() {
    if (stopped) return;
    try {
      const token = await getToken();
      const data = await fetchJobStatus(jobId, token);
      if (stopped) return;
      onUpdate(data);
      if (data.status === "completed" || data.status === "failed") return;
    } catch (err) {
      if (stopped) return;
      onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    timeoutId = setTimeout(tick, intervalMs);
  }

  tick();
  return () => {
    stopped = true;
    clearTimeout(timeoutId);
  };
}
