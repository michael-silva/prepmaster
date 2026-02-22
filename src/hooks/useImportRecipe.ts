import { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { importRecipe, type Recipe } from "@/lib/api";

type Phase = "form" | "watching" | "done" | "error";

interface ImportState {
  phase: Phase;
  jobStatus: string;
  recipe: Recipe | null;
  recipeId: string | null;
  error: string | null;
  isPermanent: boolean;
}

const INITIAL_STATE: ImportState = {
  phase: "form",
  jobStatus: "pending",
  recipe: null,
  recipeId: null,
  error: null,
  isPermanent: false,
};

function fallbackRecipe(title: string, sourceUrl: string): Recipe {
  return { title, source_url: sourceUrl, ingredients: [], steps: [] };
}

export function useImportRecipe(user: User) {
  const [state, setState] = useState<ImportState>(INITIAL_STATE);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const getToken = useCallback(() => user.getIdToken(), [user]);

  useEffect(() => {
    return () => unsubscribeRef.current?.();
  }, []);

  function watchJob(jobId: string): void {
    unsubscribeRef.current?.();

    const jobRef = doc(db, "jobs", jobId);
    unsubscribeRef.current = onSnapshot(jobRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      setState((prev) => ({ ...prev, jobStatus: data.status }));

      if (data.status === "completed" && data.recipe_id) {
        unsubscribeRef.current?.();
        try {
          const recipeSnap = await getDoc(doc(db, "recipes", data.recipe_id));
          const recipe = recipeSnap.exists()
            ? (recipeSnap.data() as Recipe) // Firestore schema controlled by us
            : fallbackRecipe(data.recipe_title ?? "Receita importada", data.url);
          setState((prev) => ({ ...prev, recipeId: data.recipe_id, recipe, phase: "done" }));
        } catch {
          setState((prev) => ({
            ...prev,
            recipeId: data.recipe_id,
            recipe: fallbackRecipe(data.recipe_title ?? "Receita importada", data.url),
            phase: "done",
          }));
        }
      } else if (data.status === "failed") {
        unsubscribeRef.current?.();
        setState((prev) => ({
          ...prev,
          error: data.error ?? "Extração falhou.",
          isPermanent: !!data.permanent,
          phase: "error",
        }));
      }
    });
  }

  async function startImport(url: string): Promise<void> {
    const trimmed = url.trim();
    if (!trimmed) return;

    setState({ ...INITIAL_STATE, phase: "watching" });

    try {
      const token = await getToken();
      const result = await importRecipe(trimmed, token);

      if (result.forked && result.recipeId) {
        const recipeSnap = await getDoc(doc(db, "recipes", result.recipeId));
        const recipe = recipeSnap.exists()
          ? (recipeSnap.data() as Recipe) // Firestore schema controlled by us
          : fallbackRecipe("Receita importada", trimmed);
        setState((prev) => ({ ...prev, recipeId: result.recipeId!, recipe, phase: "done" }));
        return;
      }

      if (result.jobId) {
        watchJob(result.jobId);
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Erro ao importar.",
        phase: "error",
      }));
    }
  }

  function reset(): void {
    unsubscribeRef.current?.();
    setState(INITIAL_STATE);
  }

  return { ...state, startImport, reset };
}
