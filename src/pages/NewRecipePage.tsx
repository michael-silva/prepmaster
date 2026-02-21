import { useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { importRecipe } from "@/lib/api";

interface NewRecipePageProps {
  user: User;
}

const DEFAULT_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export function NewRecipePage({ user }: NewRecipePageProps) {
  const [url, setUrl] = useState(`${DEFAULT_URL}`);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleImport() {
    const trimmed = url.trim();
    if (!trimmed) return;

    setStatus("loading");
    setMessage(null);

    try {
      const token = await user.getIdToken();
      await importRecipe(trimmed, token);
      setStatus("success");
      setMessage(
        "Receita enfileirada! Extraindo em segundo plano. Você pode navegar pelo app."
      );
      setUrl("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Erro ao importar.");
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        background: "var(--color-bg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <Link
          to="/"
          style={{
            color: "var(--color-muted)",
            textDecoration: "none",
            fontSize: "1.25rem",
          }}
        >
          ←
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Nova Receita
        </h1>
      </div>

      <section
        style={{
          background: "var(--color-surface)",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid rgba(124, 184, 130, 0.2)",
        }}
      >
        <p
          style={{
            color: "var(--color-muted)",
            marginBottom: "1rem",
            fontSize: "0.95rem",
          }}
        >
          Cole a URL de um blog de receita ou vídeo do YouTube e clique em
          Importar Magicamente.
        </p>

        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          disabled={status === "loading"}
          style={{
            width: "100%",
            padding: "0.875rem 1rem",
            fontSize: "1rem",
            background: "var(--color-bg)",
            color: "var(--color-text)",
            border: "1px solid rgba(124, 184, 130, 0.4)",
            borderRadius: "10px",
            marginBottom: "1rem",
          }}
        />

        <button
          type="button"
          onClick={handleImport}
          disabled={status === "loading"}
          style={{
            width: "100%",
            padding: "1rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 600,
            background: "var(--color-accent)",
            color: "var(--color-bg)",
            border: "none",
            borderRadius: "10px",
            cursor: status === "loading" ? "not-allowed" : "pointer",
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? "Enfileirando..." : "Importar Magicamente"}
        </button>

        {message && (
          <div
            role="alert"
            style={{
              marginTop: "1rem",
              padding: "1rem",
              borderRadius: "8px",
              fontSize: "0.95rem",
              background:
                status === "error"
                  ? "rgba(244, 67, 54, 0.15)"
                  : "rgba(26, 71, 42, 0.3)",
              color:
                status === "error" ? "#ff8a80" : "var(--color-accent)",
            }}
          >
            {message}
          </div>
        )}
      </section>
    </main>
  );
}
