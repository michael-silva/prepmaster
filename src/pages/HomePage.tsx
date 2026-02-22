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
    <main className="min-h-screen p-6 bg-bg">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">PrepMaster</h1>
        <div className="flex items-center gap-3">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              width={36}
              height={36}
              className="rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-muted text-sm">
            {user.displayName ?? user.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="px-4 py-2 bg-transparent text-muted border border-muted rounded-lg cursor-pointer text-sm hover:border-accent hover:text-accent transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <section className="bg-surface rounded-xl p-6 border border-border mb-6">
        <h2 className="text-xl mb-2">
          Bem-vindo, {user.displayName?.split(" ")[0] ?? "chef"}!
        </h2>
        <p className="text-muted mb-4">
          Sua sessão está ativa. Importe receitas por URL e planeje sua semana.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link
            to="/nova-receita"
            className="inline-block px-5 py-3 text-[0.95rem] font-semibold bg-accent text-bg rounded-lg no-underline hover:brightness-110 transition"
          >
            Nova Receita
          </Link>
          <Link
            to="/lista-de-compras"
            className="inline-block px-5 py-3 text-[0.95rem] font-semibold bg-transparent text-accent border border-accent rounded-lg no-underline hover:bg-accent/10 transition"
          >
            Lista de Compras
          </Link>
        </div>
      </section>

      {activeJobs.length > 0 && <ActiveJobsBanner jobs={activeJobs} />}

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Minhas Receitas</h2>
        <RecipeList recipes={recipes} loading={loading} user={user} />
      </section>

      <InstallHint />
    </main>
  );
}

function ActiveJobsBanner({ jobs }: { jobs: ActiveJob[] }) {
  const count = jobs.length;
  const label = count === 1 ? "receita sendo extraída..." : `${count} receitas sendo extraídas...`;

  return (
    <div className="bg-accent-soft border border-accent/30 rounded-lg px-5 py-3.5 mb-6 flex items-center gap-3">
      <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin shrink-0" />
      <span className="text-text text-[0.95rem] font-medium">{label}</span>
    </div>
  );
}
