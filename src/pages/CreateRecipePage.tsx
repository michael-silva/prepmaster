import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "firebase/auth";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import { createRecipe } from "@/lib/recipes";
import { syncPrepCatalog } from "@/lib/prepCatalog";
import { usePrepCatalog } from "@/hooks/usePrepCatalog";
import { useToastStore } from "@/stores/toastStore";

interface CreateRecipePageProps {
  user: User;
}

export function CreateRecipePage({ user }: CreateRecipePageProps) {
  const [saving, setSaving] = useState(false);
  const { entries: prepEntries } = usePrepCatalog(user);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  async function handleSave(data: RecipeFormData) {
    setSaving(true);
    try {
      await createRecipe(user.uid, data);
      if (data.mise_en_place.length > 0) {
        await syncPrepCatalog(user.uid, data.mise_en_place);
      }
      addToast("Receita criada com sucesso!", "success");
      navigate("/");
    } catch {
      addToast("Erro ao criar receita.", "error");
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
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Criar Receita</h1>
      </div>

      <section style={cardStyle}>
        <RecipeForm onSave={handleSave} saving={saving} prepEntries={prepEntries} />
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "12px",
  padding: "1.5rem",
  border: "1px solid rgba(124, 184, 130, 0.2)",
};
