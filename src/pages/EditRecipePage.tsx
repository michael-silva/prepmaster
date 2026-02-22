import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import { updateRecipe } from "@/lib/recipes";
import { syncPrepCatalog } from "@/lib/prepCatalog";
import { usePrepCatalog } from "@/hooks/usePrepCatalog";
import { useToastStore } from "@/stores/toastStore";

interface EditRecipePageProps {
  user: User;
}

export function EditRecipePage({ user }: EditRecipePageProps) {
  const { id } = useParams<{ id: string }>();
  const [initialData, setInitialData] = useState<RecipeFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { entries: prepEntries } = usePrepCatalog(user);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      setError("ID da receita não encontrado.");
      setLoading(false);
      return;
    }

    async function loadRecipe(recipeId: string) {
      try {
        const snap = await getDoc(doc(db, "recipes", recipeId));
        if (!snap.exists()) {
          setError("Receita não encontrada.");
          return;
        }

        const data = snap.data();
        if (data.user_id !== user.uid) {
          setError("Você não tem permissão para editar esta receita.");
          return;
        }

        setInitialData({
          title: data.title ?? "",
          source_url: data.source_url ?? "",
          servings: data.servings ?? null,
          prep_time_minutes: data.prep_time_minutes ?? null,
          cook_time_minutes: data.cook_time_minutes ?? null,
          ingredients: data.ingredients ?? [],
          steps: data.steps ?? [],
          mise_en_place: data.mise_en_place ?? [],
        });
      } catch {
        setError("Erro ao carregar receita.");
      } finally {
        setLoading(false);
      }
    }

    loadRecipe(id);
  }, [id, user.uid]);

  async function handleSave(data: RecipeFormData) {
    if (!id) return;
    setSaving(true);
    try {
      await updateRecipe(id, data);
      if (data.mise_en_place.length > 0) {
        await syncPrepCatalog(user.uid, data.mise_en_place);
      }
      addToast("Receita atualizada!", "success");
      navigate("/");
    } catch {
      addToast("Erro ao salvar receita.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen p-6 bg-bg">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-muted no-underline text-xl">←</Link>
        <h1 className="text-2xl font-semibold m-0">Editar Receita</h1>
      </div>

      {loading && (
        <p className="text-muted">Carregando...</p>
      )}

      {error && (
        <section className="bg-surface rounded-xl p-6 border border-border">
          <p className="text-error m-0">{error}</p>
          <Link to="/" className="text-accent text-sm mt-3 inline-block">
            Voltar
          </Link>
        </section>
      )}

      {!loading && !error && initialData && (
        <section className="bg-surface rounded-xl p-6 border border-border">
          <RecipeForm
            initialData={initialData}
            prepEntries={prepEntries}
            onSave={handleSave}
            saving={saving}
          />
        </section>
      )}
    </main>
  );
}
