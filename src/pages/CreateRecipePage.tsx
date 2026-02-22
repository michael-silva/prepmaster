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
    <main className="min-h-screen p-6 bg-bg">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-muted no-underline text-xl">←</Link>
        <h1 className="text-2xl font-semibold m-0">Criar Receita</h1>
      </div>

      <section className="bg-surface rounded-xl p-6 border border-border">
        <RecipeForm onSave={handleSave} saving={saving} prepEntries={prepEntries} />
      </section>
    </main>
  );
}
