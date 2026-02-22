import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "firebase/auth";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import { updateRecipe } from "@/lib/recipes";
import { syncPrepCatalog } from "@/lib/prepCatalog";
import { usePrepCatalog } from "@/hooks/usePrepCatalog";
import { useImportRecipe } from "@/hooks/useImportRecipe";
import { useToastStore } from "@/stores/toastStore";

interface NewRecipePageProps {
  user: User;
}

export function NewRecipePage({ user }: NewRecipePageProps) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { entries: prepEntries } = usePrepCatalog(user);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();
  const { phase, jobStatus, recipe, recipeId, error, isPermanent, startImport, reset } = useImportRecipe(user);

  async function handleImport() {
    await startImport(url);
  }

  async function handleSave(data: RecipeFormData) {
    if (!recipeId) return;
    setSaving(true);
    try {
      await updateRecipe(recipeId, data);
      if (data.mise_en_place.length > 0) {
        await syncPrepCatalog(user.uid, data.mise_en_place);
      }
      addToast("Receita salva com sucesso!", "success");
      navigate("/");
    } catch {
      addToast("Erro ao salvar receita.", "error");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    reset();
    setUrl("");
  }

  return (
    <main className="min-h-screen p-6 bg-bg">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-muted no-underline text-xl">←</Link>
        <h1 className="text-2xl font-semibold m-0">Nova Receita</h1>
      </div>

      {phase === "form" && (
        <>
          <div className="flex gap-2 mb-4">
            <span className="px-4 py-2 text-sm font-semibold bg-accent text-bg rounded-lg no-underline">
              Importar URL
            </span>
            <Link to="/criar-receita" className="px-4 py-2 text-sm font-medium bg-transparent text-muted border border-accent/30 rounded-lg no-underline hover:border-accent hover:text-accent transition-colors">
              Criar Manualmente
            </Link>
          </div>
          <ImportForm url={url} setUrl={setUrl} onImport={handleImport} />
        </>
      )}

      {phase === "watching" && <WatchingIndicator status={jobStatus} />}

      {phase === "error" && error && (
        <ErrorCard message={error} isPermanent={isPermanent} onRetry={handleReset} />
      )}

      {phase === "done" && recipe && (
        <>
          <div className="px-5 py-3.5 mb-4 rounded-lg bg-accent-soft border border-accent/30 text-text text-[0.95rem] font-medium">
            Receita extraída! Revise os dados abaixo e confirme.
          </div>
          <section className="bg-surface rounded-xl p-6 border border-border">
            <RecipeForm
              initialData={{
                title: recipe.title,
                source_url: recipe.source_url,
                servings: recipe.servings ?? null,
                prep_time_minutes: recipe.prep_time_minutes ?? null,
                cook_time_minutes: recipe.cook_time_minutes ?? null,
                ingredients: recipe.ingredients,
                steps: recipe.steps,
                mise_en_place: recipe.mise_en_place ?? [],
              }}
              prepEntries={prepEntries}
              onSave={handleSave}
              saving={saving}
            />
          </section>
          <button
            type="button"
            onClick={handleReset}
            className="w-full px-5 py-3.5 text-[0.95rem] font-medium bg-transparent text-muted border border-accent/30 rounded-lg cursor-pointer mt-4 hover:border-accent hover:text-accent transition-colors"
          >
            Importar outra receita
          </button>
        </>
      )}
    </main>
  );
}

interface ImportFormProps {
  url: string;
  setUrl: (v: string) => void;
  onImport: () => void;
}

function ImportForm({ url, setUrl, onImport }: ImportFormProps) {
  return (
    <section className="bg-surface rounded-xl p-6 border border-border">
      <p className="text-muted mb-4 text-[0.95rem]">
        Cole a URL de um blog de receita ou vídeo do YouTube e clique em Importar Magicamente.
      </p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="w-full px-4 py-3.5 text-base bg-bg text-text border border-accent/40 rounded-lg mb-4 focus:outline-none focus:border-accent transition-colors"
        onKeyDown={(e) => e.key === "Enter" && onImport()}
      />
      <button
        type="button"
        onClick={onImport}
        disabled={!url.trim()}
        className="w-full px-6 py-4 text-base font-semibold bg-accent text-bg border-none rounded-lg cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110 transition"
      >
        Importar Magicamente
      </button>
    </section>
  );
}

interface WatchingIndicatorProps {
  status: string;
}

function WatchingIndicator({ status }: WatchingIndicatorProps) {
  const labels: Record<string, string> = {
    pending: "Na fila...",
    processing: "Extraindo receita com IA...",
  };

  return (
    <section className="bg-surface rounded-xl p-6 border border-border">
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-10 h-10 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-text text-lg font-medium">
          {labels[status] ?? "Processando..."}
        </p>
        <p className="text-muted text-sm">
          Isso geralmente leva de 10 a 30 segundos.
        </p>
      </div>
    </section>
  );
}

interface ErrorCardProps {
  message: string;
  isPermanent: boolean;
  onRetry: () => void;
}

function ErrorCard({ message, isPermanent, onRetry }: ErrorCardProps) {
  return (
    <section className="bg-surface rounded-xl p-6 border border-border">
      <div role="alert" className="p-4 rounded-lg bg-error/15 text-error mb-4 text-[0.95rem] leading-relaxed">
        {message}
        {isPermanent && (
          <span className="block mt-2 text-xs opacity-70">
            Este erro é permanente e não será resolvido com nova tentativa para esta URL.
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="w-full px-6 py-4 text-base font-semibold bg-accent text-bg border-none rounded-lg cursor-pointer hover:brightness-110 transition"
      >
        Tentar outra URL
      </button>
    </section>
  );
}
