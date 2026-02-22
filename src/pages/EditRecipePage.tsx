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

    (async () => {
      try {
        const snap = await getDoc(doc(db, "recipes", id));
        if (!snap.exists()) {
          setError("Receita não encontrada.");
          setLoading(false);
          return;
        }

        const data = snap.data();
        if (data.user_id !== user.uid) {
          setError("Você não tem permissão para editar esta receita.");
          setLoading(false);
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
    })();
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
    <main style={{ minHeight: "100vh", padding: "1.5rem", background: "var(--color-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "var(--color-muted)", textDecoration: "none", fontSize: "1.25rem" }}>
          ←
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Editar Receita</h1>
      </div>

      {loading && (
        <p style={{ color: "var(--color-muted)" }}>Carregando...</p>
      )}

      {error && (
        <section style={cardStyle}>
          <p style={{ color: "#ff8a80", margin: 0 }}>{error}</p>
          <Link to="/" style={{ color: "var(--color-accent)", fontSize: "0.9rem", marginTop: "0.75rem", display: "inline-block" }}>
            Voltar
          </Link>
        </section>
      )}

      {!loading && !error && initialData && (
        <section style={cardStyle}>
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

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "12px",
  padding: "1.5rem",
  border: "1px solid rgba(124, 184, 130, 0.2)",
};
