import { useState, useRef } from "react";
import type { RecipeIngredient, RecipeStep, MiseEnPlace } from "@/lib/api";
import type { PrepEntry } from "@/lib/prepCatalog";
import { PrepMetadataRow } from "./PrepMetadataRow";

const AISLE_OPTIONS = [
  "Hortifruti", "Laticínios", "Açougue", "Padaria", "Frios",
  "Congelados", "Bebidas", "Mercearia", "Higiene", "Outros",
];

const INPUT_CLS = "px-3 py-2.5 text-[0.95rem] bg-bg text-text border border-border rounded-lg mb-3 w-full focus:outline-none focus:border-accent transition-colors";
const ROW_CLS = "flex gap-2 items-center mb-1";

export interface RecipeFormData {
  title: string;
  source_url: string;
  servings: number | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  mise_en_place: MiseEnPlace[];
}

interface RecipeFormProps {
  initialData?: Partial<RecipeFormData>;
  prepEntries?: PrepEntry[];
  onSave: (data: RecipeFormData) => Promise<void>;
  saving: boolean;
}

interface Keyed { _key: string }
type KeyedIngredient = RecipeIngredient & Keyed;
type KeyedStep = RecipeStep & Keyed;
type KeyedMep = MiseEnPlace & Keyed;

function useKeyCounter(): () => string {
  const counter = useRef(0);
  return () => `k-${++counter.current}`;
}

function keyedIngredient(nextKey: () => string, data?: RecipeIngredient): KeyedIngredient {
  return { _key: nextKey(), item: "", quantity: undefined, unit: undefined, aisle: undefined, ...data };
}

function keyedStep(nextKey: () => string, order: number, data?: RecipeStep): KeyedStep {
  return { _key: nextKey(), order, instruction: "", ...data };
}

function keyedMep(nextKey: () => string, data?: MiseEnPlace): KeyedMep {
  return { _key: nextKey(), ingredient: "", technique: "", quantity: undefined, ...data };
}

function stripKey<T extends Keyed>(items: T[]): Omit<T, "_key">[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return items.map(({ _key, ...rest }) => rest);
}

export function RecipeForm({ initialData, prepEntries, onSave, saving }: RecipeFormProps) {
  const nextKey = useKeyCounter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url ?? "");
  const [servings, setServings] = useState<string>(initialData?.servings?.toString() ?? "");
  const [prepTime, setPrepTime] = useState<string>(initialData?.prep_time_minutes?.toString() ?? "");
  const [cookTime, setCookTime] = useState<string>(initialData?.cook_time_minutes?.toString() ?? "");
  const [ingredients, setIngredients] = useState<KeyedIngredient[]>(
    initialData?.ingredients?.length
      ? initialData.ingredients.map((i) => keyedIngredient(nextKey, i))
      : [keyedIngredient(nextKey)]
  );
  const [steps, setSteps] = useState<KeyedStep[]>(
    initialData?.steps?.length
      ? initialData.steps.map((s) => keyedStep(nextKey, s.order, s))
      : [keyedStep(nextKey, 1)]
  );
  const [mep, setMep] = useState<KeyedMep[]>(
    initialData?.mise_en_place?.length
      ? initialData.mise_en_place.map((m) => keyedMep(nextKey, m))
      : []
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const data: RecipeFormData = {
      title: title.trim(),
      source_url: sourceUrl.trim(),
      servings: servings ? parseInt(servings, 10) || null : null,
      prep_time_minutes: prepTime ? parseInt(prepTime, 10) || null : null,
      cook_time_minutes: cookTime ? parseInt(cookTime, 10) || null : null,
      ingredients: stripKey(ingredients.filter((i) => i.item.trim())) as RecipeIngredient[],
      steps: (stripKey(steps.filter((s) => s.instruction.trim())) as RecipeStep[])
        .map((s, idx) => ({ ...s, order: idx + 1 })),
      mise_en_place: stripKey(mep.filter((m) => m.ingredient.trim() && m.technique.trim())) as MiseEnPlace[],
    };

    onSave(data);
  }

  function updateIngredient<K extends keyof RecipeIngredient>(idx: number, field: K, value: RecipeIngredient[K]) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, instruction: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, instruction } : s))
    );
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  }

  function updateMep(idx: number, field: keyof MiseEnPlace, value: string) {
    setMep((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m))
    );
  }

  function removeMep(idx: number) {
    setMep((prev) => prev.filter((_, i) => i !== idx));
  }

  function findPrepEntry(ingredient: string, technique: string): PrepEntry | undefined {
    if (!prepEntries) return undefined;
    const normI = ingredient.trim().toLowerCase();
    const normT = technique.trim().toLowerCase();
    return prepEntries.find(
      (e) => e.ingredient.trim().toLowerCase() === normI && e.technique.trim().toLowerCase() === normT
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <label className="block text-sm font-medium text-muted mb-1">Título *</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className={INPUT_CLS}
        placeholder="Nome da receita"
      />

      <label className="block text-sm font-medium text-muted mb-1">URL de origem</label>
      <input
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        className={INPUT_CLS}
        placeholder="https://... (opcional)"
      />

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-muted mb-1">Porções</label>
          <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} className={INPUT_CLS} min={0} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-muted mb-1">Preparo (min)</label>
          <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className={INPUT_CLS} min={0} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-muted mb-1">Cozimento (min)</label>
          <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className={INPUT_CLS} min={0} />
        </div>
      </div>

      <SectionHeader title="Ingredientes" onAdd={() => setIngredients((p) => [...p, keyedIngredient(nextKey)])} />
      {ingredients.map((ing, idx) => (
        <div key={ing._key} className={ROW_CLS}>
          <input
            type="number"
            value={ing.quantity ?? ""}
            onChange={(e) => updateIngredient(idx, "quantity", e.target.value ? parseFloat(e.target.value) : undefined)}
            className={`${INPUT_CLS} !w-[70px] !mb-0`}
            placeholder="Qtd"
            step="any"
          />
          <input
            type="text"
            value={ing.unit ?? ""}
            onChange={(e) => updateIngredient(idx, "unit", e.target.value || undefined)}
            className={`${INPUT_CLS} !w-20 !mb-0`}
            placeholder="Un."
          />
          <input
            type="text"
            value={ing.item}
            onChange={(e) => updateIngredient(idx, "item", e.target.value)}
            className={`${INPUT_CLS} flex-1 !mb-0`}
            placeholder="Ingrediente"
          />
          <select
            value={ing.aisle ?? ""}
            onChange={(e) => updateIngredient(idx, "aisle", e.target.value || undefined)}
            className={`${INPUT_CLS} !w-[120px] !mb-0`}
          >
            <option value="">Corredor</option>
            {AISLE_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button type="button" onClick={() => removeIngredient(idx)} className="bg-transparent border-none text-muted text-xl cursor-pointer px-1 shrink-0 hover:text-error transition-colors">×</button>
        </div>
      ))}

      <SectionHeader title="Modo de Preparo" onAdd={() => setSteps((p) => [...p, keyedStep(nextKey, p.length + 1)])} />
      {steps.map((step, idx) => (
        <div key={step._key} className={ROW_CLS}>
          <span className="text-muted text-sm min-w-[24px]">{idx + 1}.</span>
          <textarea
            value={step.instruction}
            onChange={(e) => updateStep(idx, e.target.value)}
            className={`${INPUT_CLS} flex-1 !mb-0 min-h-[48px] resize-y`}
            placeholder="Instrução do passo"
          />
          <button type="button" onClick={() => removeStep(idx)} className="bg-transparent border-none text-muted text-xl cursor-pointer px-1 shrink-0 hover:text-error transition-colors">×</button>
        </div>
      ))}

      <SectionHeader title="Mise en Place" onAdd={() => setMep((p) => [...p, keyedMep(nextKey)])} />
      {mep.map((m, idx) => {
        const entry = findPrepEntry(m.ingredient, m.technique);
        return (
          <div key={m._key} className="mb-2">
            <div className={ROW_CLS}>
              <input
                type="text"
                value={m.ingredient}
                onChange={(e) => updateMep(idx, "ingredient", e.target.value)}
                className={`${INPUT_CLS} flex-1 !mb-0`}
                placeholder="Ingrediente"
              />
              <input
                type="text"
                value={m.technique}
                onChange={(e) => updateMep(idx, "technique", e.target.value)}
                className={`${INPUT_CLS} flex-1 !mb-0`}
                placeholder="Técnica"
              />
              <input
                type="text"
                value={m.quantity ?? ""}
                onChange={(e) => updateMep(idx, "quantity", e.target.value)}
                className={`${INPUT_CLS} !w-[90px] !mb-0`}
                placeholder="Qtd"
              />
              <button type="button" onClick={() => removeMep(idx)} className="bg-transparent border-none text-muted text-xl cursor-pointer px-1 shrink-0 hover:text-error transition-colors">×</button>
            </div>
            {entry && <PrepMetadataRow entry={entry} />}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="w-full px-6 py-4 text-base font-semibold bg-accent text-bg border-none rounded-lg mt-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition"
      >
        {saving ? "Salvando..." : "Salvar Receita"}
      </button>
    </form>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex justify-between items-center mb-2 mt-4">
      <h3 className="text-base font-semibold m-0 text-accent">{title}</h3>
      <button type="button" onClick={onAdd} className="bg-transparent border border-accent/40 text-accent text-sm font-medium rounded-md px-2.5 py-1 cursor-pointer hover:bg-accent/10 transition-colors">
        + Adicionar
      </button>
    </div>
  );
}
