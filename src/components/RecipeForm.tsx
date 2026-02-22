import { useState, useRef } from "react";
import type { RecipeIngredient, RecipeStep, MiseEnPlace } from "@/lib/api";
import type { PrepEntry } from "@/lib/prepCatalog";
import { PrepMetadataRow } from "./PrepMetadataRow";

const AISLE_OPTIONS = [
  "Hortifruti", "Laticínios", "Açougue", "Padaria", "Frios",
  "Congelados", "Bebidas", "Mercearia", "Higiene", "Outros",
];

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
      <label style={labelStyle}>Título *</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        style={inputStyle}
        placeholder="Nome da receita"
      />

      <label style={labelStyle}>URL de origem</label>
      <input
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        style={inputStyle}
        placeholder="https://... (opcional)"
      />

      <div style={metaRowStyle}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Porções</label>
          <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} style={inputStyle} min={0} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Preparo (min)</label>
          <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} style={inputStyle} min={0} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Cozimento (min)</label>
          <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} style={inputStyle} min={0} />
        </div>
      </div>

      <SectionHeader title="Ingredientes" onAdd={() => setIngredients((p) => [...p, keyedIngredient(nextKey)])} />
      {ingredients.map((ing, idx) => (
        <div key={ing._key} style={rowStyle}>
          <input
            type="number"
            value={ing.quantity ?? ""}
            onChange={(e) => updateIngredient(idx, "quantity", e.target.value ? parseFloat(e.target.value) : undefined)}
            style={{ ...inputStyle, width: "70px", marginBottom: 0 }}
            placeholder="Qtd"
            step="any"
          />
          <input
            type="text"
            value={ing.unit ?? ""}
            onChange={(e) => updateIngredient(idx, "unit", e.target.value || undefined)}
            style={{ ...inputStyle, width: "80px", marginBottom: 0 }}
            placeholder="Un."
          />
          <input
            type="text"
            value={ing.item}
            onChange={(e) => updateIngredient(idx, "item", e.target.value)}
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
            placeholder="Ingrediente"
          />
          <select
            value={ing.aisle ?? ""}
            onChange={(e) => updateIngredient(idx, "aisle", e.target.value || undefined)}
            style={{ ...inputStyle, width: "120px", marginBottom: 0 }}
          >
            <option value="">Corredor</option>
            {AISLE_OPTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <button type="button" onClick={() => removeIngredient(idx)} style={removeBtnStyle}>×</button>
        </div>
      ))}

      <SectionHeader title="Modo de Preparo" onAdd={() => setSteps((p) => [...p, keyedStep(nextKey, p.length + 1)])} />
      {steps.map((step, idx) => (
        <div key={step._key} style={rowStyle}>
          <span style={stepNumberStyle}>{idx + 1}.</span>
          <textarea
            value={step.instruction}
            onChange={(e) => updateStep(idx, e.target.value)}
            style={{ ...inputStyle, flex: 1, marginBottom: 0, minHeight: "48px", resize: "vertical" }}
            placeholder="Instrução do passo"
          />
          <button type="button" onClick={() => removeStep(idx)} style={removeBtnStyle}>×</button>
        </div>
      ))}

      <SectionHeader title="Mise en Place" onAdd={() => setMep((p) => [...p, keyedMep(nextKey)])} />
      {mep.map((m, idx) => {
        const entry = findPrepEntry(m.ingredient, m.technique);
        return (
          <div key={m._key} style={{ marginBottom: "0.5rem" }}>
            <div style={rowStyle}>
              <input
                type="text"
                value={m.ingredient}
                onChange={(e) => updateMep(idx, "ingredient", e.target.value)}
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                placeholder="Ingrediente"
              />
              <input
                type="text"
                value={m.technique}
                onChange={(e) => updateMep(idx, "technique", e.target.value)}
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
                placeholder="Técnica"
              />
              <input
                type="text"
                value={m.quantity ?? ""}
                onChange={(e) => updateMep(idx, "quantity", e.target.value)}
                style={{ ...inputStyle, width: "90px", marginBottom: 0 }}
                placeholder="Qtd"
              />
              <button type="button" onClick={() => removeMep(idx)} style={removeBtnStyle}>×</button>
            </div>
            {entry && <PrepMetadataRow entry={entry} />}
          </div>
        );
      })}

      <button
        type="submit"
        disabled={saving || !title.trim()}
        style={{
          ...submitBtnStyle,
          opacity: saving || !title.trim() ? 0.5 : 1,
          cursor: saving || !title.trim() ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Salvando..." : "Salvar Receita"}
      </button>
    </form>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div style={sectionHeaderStyle}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--color-accent)" }}>{title}</h3>
      <button type="button" onClick={onAdd} style={addBtnStyle}>+ Adicionar</button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 500,
  color: "var(--color-muted)",
  marginBottom: "0.25rem",
};

const inputStyle: React.CSSProperties = {
  padding: "0.65rem 0.75rem",
  fontSize: "0.95rem",
  background: "var(--color-bg)",
  color: "var(--color-text)",
  border: "1px solid rgba(124, 184, 130, 0.3)",
  borderRadius: "8px",
  marginBottom: "0.75rem",
  boxSizing: "border-box",
  width: "100%",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
  marginBottom: "0.35rem",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "0.75rem",
  marginBottom: "1rem",
};

const stepNumberStyle: React.CSSProperties = {
  color: "var(--color-muted)",
  fontSize: "0.85rem",
  minWidth: "24px",
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "0.5rem",
  marginTop: "1rem",
};

const removeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--color-muted)",
  fontSize: "1.25rem",
  cursor: "pointer",
  padding: "0 0.25rem",
  flexShrink: 0,
};

const addBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(124, 184, 130, 0.4)",
  color: "var(--color-accent)",
  fontSize: "0.8rem",
  fontWeight: 500,
  borderRadius: "6px",
  padding: "0.3rem 0.65rem",
  cursor: "pointer",
};

const submitBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 1.5rem",
  fontSize: "1rem",
  fontWeight: 600,
  background: "var(--color-accent)",
  color: "var(--color-bg)",
  border: "none",
  borderRadius: "10px",
  marginTop: "1.5rem",
};
