import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type UpdateData,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RecipeIngredient, RecipeStep, MiseEnPlace } from "@/lib/api";

export interface RecipeData {
  title: string;
  source_url?: string;
  servings?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  mise_en_place?: MiseEnPlace[];
}

export async function createRecipe(uid: string, data: RecipeData): Promise<string> {
  const docRef = await addDoc(collection(db, "recipes"), {
    user_id: uid,
    title: data.title,
    source_url: data.source_url || null,
    servings: data.servings ?? null,
    prep_time_minutes: data.prep_time_minutes ?? null,
    cook_time_minutes: data.cook_time_minutes ?? null,
    ingredients: data.ingredients,
    steps: data.steps,
    mise_en_place: data.mise_en_place ?? [],
    forked_from: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateRecipe(recipeId: string, data: Partial<RecipeData>) {
  const updates: UpdateData<DocumentData> = { updated_at: serverTimestamp() };

  if (data.title !== undefined) updates.title = data.title;
  if (data.source_url !== undefined) updates.source_url = data.source_url || null;
  if (data.servings !== undefined) updates.servings = data.servings ?? null;
  if (data.prep_time_minutes !== undefined) updates.prep_time_minutes = data.prep_time_minutes ?? null;
  if (data.cook_time_minutes !== undefined) updates.cook_time_minutes = data.cook_time_minutes ?? null;
  if (data.ingredients !== undefined) updates.ingredients = data.ingredients;
  if (data.steps !== undefined) updates.steps = data.steps;
  if (data.mise_en_place !== undefined) updates.mise_en_place = data.mise_en_place;

  await updateDoc(doc(db, "recipes", recipeId), updates);
}

export async function deleteRecipe(recipeId: string) {
  await deleteDoc(doc(db, "recipes", recipeId));
}
