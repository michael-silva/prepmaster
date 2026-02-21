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

export interface ExtractedRecipe {
  title: string;
  source_url: string;
  servings?: number;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  mise_en_place?: MiseEnPlace[];
}

export const RECIPE_EXTRACTION_PROMPT = `Extract the recipe from the provided web content. Return a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "title": "string - recipe name",
  "source_url": "string - the URL provided",
  "servings": number or null,
  "prep_time_minutes": number or null,
  "cook_time_minutes": number or null,
  "ingredients": [
    { "quantity": number or null, "unit": "string or null", "item": "string", "aisle": "string - supermarket section like Hortifruti, Laticínios, Açougue, Padaria, etc" }
  ],
  "steps": [
    { "order": 1, "instruction": "string" }
  ],
  "mise_en_place": [
    { "ingredient": "string", "technique": "string - e.g. cortar, ralar, bater", "quantity": "string or null" }
  ]
}

Rules:
- aisle must be one of: Hortifruti, Laticínios, Açougue, Padaria, Frios, Congelados, Bebidas, Mercearia, Higiene, Outros
- If information is missing, use null
- mise_en_place: list pre-prep tasks (cutting, grating, etc) that can be done in advance
- Extract only what appears in the content; do not invent`;
