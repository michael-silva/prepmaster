import type { User } from "firebase/auth";
import { Link } from "react-router-dom";
import type { StoredRecipe } from "@/hooks/useRecipes";
import { addRecipeToList } from "@/lib/shopping";
import { useToastStore } from "@/stores/toastStore";

interface RecipeListProps {
  recipes: StoredRecipe[];
  loading: boolean;
  user?: User;
}

export function RecipeList({ recipes, loading, user }: RecipeListProps) {
  if (loading) {
    return (
      <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
        Carregando receitas...
      </p>
    );
  }

  if (recipes.length === 0) {
    return (
      <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>
        Nenhuma receita importada ainda.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} uid={user?.uid} />
      ))}
    </div>
  );
}

interface RecipeCardProps {
  recipe: StoredRecipe;
  uid?: string;
}

function RecipeCard({ recipe, uid }: RecipeCardProps) {
  const addToast = useToastStore((s) => s.addToast);

  async function handleAddToList() {
    if (!uid || recipe.ingredients.length === 0) return;
    try {
      await addRecipeToList(uid, recipe.id, recipe.ingredients);
      addToast(`${recipe.ingredients.length} ingredientes adicionados à lista!`, "success");
    } catch {
      addToast("Erro ao adicionar à lista.", "error");
    }
  }

  return (
    <article style={cardStyle}>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, marginBottom: "0.25rem" }}>
        {recipe.title}
      </h3>
      <div style={metaRow}>
        {recipe.servings != null && <span>{recipe.servings} porções</span>}
        {recipe.prep_time_minutes != null && (
          <span>Preparo: {recipe.prep_time_minutes} min</span>
        )}
        {recipe.cook_time_minutes != null && (
          <span>Cozimento: {recipe.cook_time_minutes} min</span>
        )}
        {recipe.ingredients.length > 0 && (
          <span>{recipe.ingredients.length} ingredientes</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {recipe.source_url && (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--color-accent)",
              fontSize: "0.8rem",
              textDecoration: "none",
            }}
          >
            Ver fonte
          </a>
        )}
        {uid && recipe.ingredients.length > 0 && (
          <button
            type="button"
            onClick={handleAddToList}
            style={actionBtnStyle}
          >
            Enviar para lista
          </button>
        )}
        <Link to={`/editar-receita/${recipe.id}`} style={actionBtnStyle}>
          Editar
        </Link>
      </div>
    </article>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "10px",
  padding: "1rem 1.25rem",
  border: "1px solid rgba(124, 184, 130, 0.15)",
};

const metaRow: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
  color: "var(--color-muted)",
  fontSize: "0.8rem",
  marginBottom: "0.35rem",
};

const actionBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(124, 184, 130, 0.4)",
  color: "var(--color-accent)",
  fontSize: "0.8rem",
  fontWeight: 500,
  borderRadius: "6px",
  padding: "0.3rem 0.65rem",
  cursor: "pointer",
  textDecoration: "none",
};
