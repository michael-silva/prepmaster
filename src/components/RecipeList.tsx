import type { StoredRecipe } from "@/hooks/useRecipes";

interface RecipeListProps {
  recipes: StoredRecipe[];
  loading: boolean;
}

export function RecipeList({ recipes, loading }: RecipeListProps) {
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
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: StoredRecipe }) {
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
