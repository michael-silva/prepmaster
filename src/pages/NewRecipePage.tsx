import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { importRecipe, type Recipe } from "@/lib/api";
import { RecipeForm, type RecipeFormData } from "@/components/RecipeForm";
import { updateRecipe } from "@/lib/recipes";
import { syncPrepCatalog } from "@/lib/prepCatalog";
import { usePrepCatalog } from "@/hooks/usePrepCatalog";
import { useToastStore } from "@/stores/toastStore";

interface NewRecipePageProps {
  user: User;
}

type Phase = "form" | "watching" | "done" | "error";

export function NewRecipePage({ user }: NewRecipePageProps) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeId, setRecipeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permanent, setPermanent] = useState(false);
  const [saving, setSaving] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const { entries: prepEntries } = usePrepCatalog(user);
  const addToast = useToastStore((s) => s.addToast);
  const navigate = useNavigate();

  const getToken = useCallback(() => user.getIdToken(), [user]);

  useEffect(() => {
    return () => unsubscribeRef.current?.();
  }, []);

  function watchJob(jobId: string) {
    unsubscribeRef.current?.();

    const jobRef = doc(db, "jobs", jobId);
    unsubscribeRef.current = onSnapshot(jobRef, async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();

      setJobStatus(data.status);

      if (data.status === "completed" && data.recipe_id) {
        unsubscribeRef.current?.();
        setRecipeId(data.recipe_id);
        try {
          const recipeSnap = await getDoc(doc(db, "recipes", data.recipe_id));
          if (recipeSnap.exists()) {
            setRecipe(recipeSnap.data() as Recipe);
            setPhase("done");
          }
        } catch {
          setRecipe({
            title: data.recipe_title || "Receita importada",
            source_url: data.url,
            ingredients: [],
            steps: [],
          });
          setPhase("done");
        }
      } else if (data.status === "failed") {
        unsubscribeRef.current?.();
        setError(data.error ?? "Extração falhou.");
        setPermanent(!!data.permanent);
        setPhase("error");
      }
    });
  }

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setPhase("watching");
    setError(null);
    setRecipe(null);
    setRecipeId(null);
    setJobStatus("pending");
    setPermanent(false);

    try {
      const token = await getToken();
      const result = await importRecipe(trimmed, token);

      if (result.forked && result.recipeId) {
        setRecipeId(result.recipeId);
        const recipeSnap = await getDoc(doc(db, "recipes", result.recipeId));
        if (recipeSnap.exists()) {
          setRecipe(recipeSnap.data() as Recipe);
        } else {
          setRecipe({ title: "Receita importada", source_url: trimmed, ingredients: [], steps: [] });
        }
        setPhase("done");
        return;
      }

      if (result.jobId) {
        watchJob(result.jobId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar.");
      setPhase("error");
    }
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
    unsubscribeRef.current?.();
    setPhase("form");
    setUrl("");
    setError(null);
    setRecipe(null);
    setRecipeId(null);
    setJobStatus("pending");
    setPermanent(false);
  }

  return (
    <main style={{ minHeight: "100vh", padding: "1.5rem", background: "var(--color-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "var(--color-muted)", textDecoration: "none", fontSize: "1.25rem" }}>
          ←
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Nova Receita</h1>
      </div>

      {phase === "form" && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={activeTabStyle}>Importar URL</span>
            <Link to="/criar-receita" style={inactiveTabStyle}>Criar Manualmente</Link>
          </div>
          <ImportForm url={url} setUrl={setUrl} onImport={handleImport} />
        </>
      )}

      {phase === "watching" && (
        <WatchingIndicator status={jobStatus} />
      )}

      {phase === "error" && (
        <ErrorCard
          message={error!}
          permanent={permanent}
          onRetry={handleReset}
        />
      )}

      {phase === "done" && recipe && (
        <>
          <div style={successBannerStyle}>
            Receita extraída! Revise os dados abaixo e confirme.
          </div>
          <section style={cardStyle}>
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
          <button type="button" onClick={handleReset} style={secondaryBtnStyle}>
            Importar outra receita
          </button>
        </>
      )}
    </main>
  );
}

function ImportForm({
  url,
  setUrl,
  onImport,
}: {
  url: string;
  setUrl: (v: string) => void;
  onImport: () => void;
}) {
  return (
    <section style={cardStyle}>
      <p style={{ color: "var(--color-muted)", marginBottom: "1rem", fontSize: "0.95rem" }}>
        Cole a URL de um blog de receita ou vídeo do YouTube e clique em Importar Magicamente.
      </p>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        style={inputStyle}
        onKeyDown={(e) => e.key === "Enter" && onImport()}
      />
      <button type="button" onClick={onImport} disabled={!url.trim()} style={buttonStyle(!url.trim())}>
        Importar Magicamente
      </button>
    </section>
  );
}

function WatchingIndicator({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: "Na fila...",
    processing: "Extraindo receita com IA...",
  };

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem 0" }}>
        <div style={spinnerStyle} />
        <p style={{ color: "var(--color-text)", fontSize: "1.1rem", fontWeight: 500 }}>
          {labels[status] ?? "Processando..."}
        </p>
        <p style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
          Isso geralmente leva de 10 a 30 segundos.
        </p>
      </div>
    </section>
  );
}

function ErrorCard({
  message,
  permanent,
  onRetry,
}: {
  message: string;
  permanent?: boolean;
  onRetry: () => void;
}) {
  return (
    <section style={cardStyle}>
      <div
        role="alert"
        style={{
          padding: "1rem",
          borderRadius: "8px",
          background: "rgba(244, 67, 54, 0.15)",
          color: "#ff8a80",
          marginBottom: "1rem",
          fontSize: "0.95rem",
          lineHeight: 1.5,
        }}
      >
        {message}
        {permanent && (
          <span style={{ display: "block", marginTop: "0.5rem", fontSize: "0.8rem", opacity: 0.7 }}>
            Este erro é permanente e não será resolvido com nova tentativa para esta URL.
          </span>
        )}
      </div>
      <button type="button" onClick={onRetry} style={buttonStyle(false)}>
        Tentar outra URL
      </button>
    </section>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "12px",
  padding: "1.5rem",
  border: "1px solid rgba(124, 184, 130, 0.2)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1rem",
  fontSize: "1rem",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  border: "1px solid rgba(124, 184, 130, 0.4)",
  borderRadius: "10px",
  marginBottom: "1rem",
  boxSizing: "border-box",
};

const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "1rem 1.5rem",
  fontSize: "1rem",
  fontWeight: 600,
  background: "var(--color-accent)",
  color: "var(--color-bg)",
  border: "none",
  borderRadius: "10px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

const successBannerStyle: React.CSSProperties = {
  padding: "0.875rem 1.25rem",
  marginBottom: "1rem",
  borderRadius: "10px",
  background: "rgba(124, 184, 130, 0.12)",
  border: "1px solid rgba(124, 184, 130, 0.3)",
  color: "var(--color-text)",
  fontSize: "0.95rem",
  fontWeight: 500,
};

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1.25rem",
  fontSize: "0.95rem",
  fontWeight: 500,
  background: "transparent",
  color: "var(--color-muted)",
  border: "1px solid rgba(124, 184, 130, 0.3)",
  borderRadius: "10px",
  cursor: "pointer",
  marginTop: "1rem",
};

const spinnerStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  border: "3px solid rgba(124, 184, 130, 0.2)",
  borderTopColor: "var(--color-accent)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const activeTabStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  fontSize: "0.9rem",
  fontWeight: 600,
  background: "var(--color-accent)",
  color: "var(--color-bg)",
  borderRadius: "8px",
  textDecoration: "none",
};

const inactiveTabStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  fontSize: "0.9rem",
  fontWeight: 500,
  background: "transparent",
  color: "var(--color-muted)",
  border: "1px solid rgba(124, 184, 130, 0.3)",
  borderRadius: "8px",
  textDecoration: "none",
};
