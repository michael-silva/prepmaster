import type { User } from "firebase/auth";
import { Link } from "react-router-dom";
import { signOut } from "@/lib/auth";
import { InstallHint } from "@/components/InstallHint";

interface HomePageProps {
  user: User;
}

export function HomePage({ user }: HomePageProps) {
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

      <div style={{ marginTop: "1.5rem" }}>
        <InstallHint />
      </div>
    </main>
  );
}
