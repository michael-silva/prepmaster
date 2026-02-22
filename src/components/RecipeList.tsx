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
    return <p className="text-muted text-[0.95rem]">Carregando receitas...</p>;
  }

  if (recipes.length === 0) {
    return <p className="text-muted text-[0.95rem]">Nenhuma receita importada ainda.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
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
    <article className="bg-surface rounded-lg px-5 py-4 border border-border/60">
      <h3 className="text-lg font-semibold mb-1">
        {recipe.title}
      </h3>
      <div className="flex gap-3 flex-wrap text-muted text-sm mb-1">
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
      <div className="flex items-center gap-4">
        {recipe.source_url && (
          <a
            href={recipe.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent text-sm no-underline hover:underline"
          >
            Ver fonte
          </a>
        )}
        {uid && recipe.ingredients.length > 0 && (
          <button
            type="button"
            onClick={handleAddToList}
            className="bg-transparent border border-accent/40 text-accent text-sm font-medium rounded-md px-2.5 py-1 cursor-pointer hover:bg-accent/10 transition-colors"
          >
            Enviar para lista
          </button>
        )}
        <Link
          to={`/editar-receita/${recipe.id}`}
          className="bg-transparent border border-accent/40 text-accent text-sm font-medium rounded-md px-2.5 py-1 no-underline hover:bg-accent/10 transition-colors"
        >
          Editar
        </Link>
      </div>
    </article>
  );
}
