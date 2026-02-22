import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { importRecipe, type Recipe } from "@/lib/api";

interface NewRecipePageProps {
  user: User;
}

type Phase = "form" | "watching" | "done" | "error";

export function NewRecipePage({ user }: NewRecipePageProps) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("form");
  const [jobStatus, setJobStatus] = useState<string>("pending");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permanent, setPermanent] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

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
        try {
          const recipeSnap = await getDoc(doc(db, "recipes", data.recipe_id));
          if (recipeSnap.exists()) {
            const r = recipeSnap.data() as Recipe;
            setRecipe(r);
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
    setJobStatus("pending");
    setPermanent(false);

    try {
      const token = await getToken();
      const { jobId } = await importRecipe(trimmed, token);
      watchJob(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar.");
      setPhase("error");
    }
  }

  function handleReset() {
    unsubscribeRef.current?.();
    setPhase("form");
    setUrl("");
    setError(null);
    setRecipe(null);
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
        <ImportForm url={url} setUrl={setUrl} onImport={handleImport} />
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
        <RecipeCard recipe={recipe} onNewRecipe={handleReset} />
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

function RecipeCard({ recipe, onNewRecipe }: { recipe: Recipe; onNewRecipe: () => void }) {
  return (
    <section style={cardStyle}>
      <h2 style={{ fontSize: "1.35rem", fontWeight: 600, marginBottom: "0.25rem" }}>{recipe.title}</h2>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "var(--color-muted)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
        {recipe.servings && <span>{recipe.servings} porções</span>}
        {recipe.prep_time_minutes && <span>Preparo: {recipe.prep_time_minutes} min</span>}
        {recipe.cook_time_minutes && <span>Cozimento: {recipe.cook_time_minutes} min</span>}
      </div>

      {recipe.ingredients.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={sectionTitle}>Ingredientes</h3>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
                {ing.quantity != null && <strong>{ing.quantity} </strong>}
                {ing.unit && <span>{ing.unit} </span>}
                <span>{ing.item}</span>
                {ing.aisle && (
                  <span style={{ color: "var(--color-muted)", fontSize: "0.8rem", marginLeft: "0.5rem" }}>
                    ({ing.aisle})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.steps.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={sectionTitle}>Modo de Preparo</h3>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recipe.steps.map((step) => (
              <li key={step.order} style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
                {step.instruction}
              </li>
            ))}
          </ol>
        </div>
      )}

      {recipe.mise_en_place && recipe.mise_en_place.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={sectionTitle}>Mise en Place</h3>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {recipe.mise_en_place.map((m, i) => (
              <li key={i} style={{ fontSize: "0.95rem", lineHeight: 1.5 }}>
                <strong>{m.ingredient}</strong> — {m.technique}
                {m.quantity && <span style={{ color: "var(--color-muted)" }}> ({m.quantity})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.source_url && (
        <a
          href={recipe.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", color: "var(--color-accent)", fontSize: "0.85rem", marginBottom: "1.25rem" }}
        >
          Ver fonte original
        </a>
      )}

      <button type="button" onClick={onNewRecipe} style={buttonStyle(false)}>
        Importar outra receita
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

const sectionTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 600,
  marginBottom: "0.5rem",
  color: "var(--color-accent)",
};

const spinnerStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  border: "3px solid rgba(124, 184, 130, 0.2)",
  borderTopColor: "var(--color-accent)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};
