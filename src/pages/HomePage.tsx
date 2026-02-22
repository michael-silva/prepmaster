import type { User } from "firebase/auth";
import { Link } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { InstallHint } from "@/components/InstallHint";
import { RecipeList } from "@/components/RecipeList";
import { useRecipes } from "@/hooks/useRecipes";
import type { ActiveJob } from "@/hooks/useJobTracker";

interface HomePageProps {
  user: User;
  activeJobs: ActiveJob[];
}

export function HomePage({ user, activeJobs }: HomePageProps) {
  const { recipes, loading } = useRecipes(user);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "1.5rem",
        background: "var(--color-bg)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>PrepMaster</h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              width={36}
              height={36}
              style={{ borderRadius: "50%" }}
              referrerPolicy="no-referrer"
            />
          )}
          <span style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>
            {user.displayName ?? user.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              color: "var(--color-muted)",
              border: "1px solid var(--color-muted)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <section
        style={{
          background: "var(--color-surface)",
          borderRadius: "12px",
          padding: "1.5rem",
          border: "1px solid rgba(124, 184, 130, 0.2)",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Bem-vindo, {user.displayName?.split(" ")[0] ?? "chef"}!
        </h2>
        <p style={{ color: "var(--color-muted)", marginBottom: "1rem" }}>
          Sua sessão está ativa. Importe receitas por URL e planeje sua semana.
        </p>
        <Link
          to="/nova-receita"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.25rem",
            fontSize: "0.95rem",
            fontWeight: 600,
            background: "var(--color-accent)",
            color: "var(--color-bg)",
            borderRadius: "10px",
            textDecoration: "none",
          }}
        >
          Nova Receita
        </Link>
      </section>

      {activeJobs.length > 0 && <ActiveJobsBanner jobs={activeJobs} />}

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Minhas Receitas
        </h2>
        <RecipeList recipes={recipes} loading={loading} />
      </section>

      <InstallHint />
    </main>
  );
}

function ActiveJobsBanner({ jobs }: { jobs: ActiveJob[] }) {
  const count = jobs.length;
  const label = count === 1 ? "receita sendo extraída..." : `${count} receitas sendo extraídas...`;

  return (
    <div
      style={{
        background: "rgba(124, 184, 130, 0.12)",
        border: "1px solid rgba(124, 184, 130, 0.3)",
        borderRadius: "10px",
        padding: "0.875rem 1.25rem",
        marginBottom: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <div style={smallSpinnerStyle} />
      <span style={{ color: "var(--color-text)", fontSize: "0.95rem", fontWeight: 500 }}>
        {label}
      </span>
    </div>
  );
}

const smallSpinnerStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  border: "2px solid rgba(124, 184, 130, 0.2)",
  borderTopColor: "var(--color-accent)",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
  flexShrink: 0,
};
