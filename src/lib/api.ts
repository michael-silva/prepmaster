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
