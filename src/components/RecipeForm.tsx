import { useState } from "react";
import type { RecipeIngredient, RecipeStep, MiseEnPlace } from "@/lib/api";
import type { PrepEntry } from "@/lib/prepCatalog";
import { updatePrepEntry } from "@/lib/prepCatalog";

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

function emptyIngredient(): RecipeIngredient {
  return { item: "", quantity: undefined, unit: undefined, aisle: undefined };
}

function emptyStep(order: number): RecipeStep {
  return { order, instruction: "" };
}

function emptyMep(): MiseEnPlace {
  return { ingredient: "", technique: "", quantity: undefined };
}

export function RecipeForm({ initialData, prepEntries, onSave, saving }: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialData?.source_url ?? "");
  const [servings, setServings] = useState<string>(initialData?.servings?.toString() ?? "");
  const [prepTime, setPrepTime] = useState<string>(initialData?.prep_time_minutes?.toString() ?? "");
  const [cookTime, setCookTime] = useState<string>(initialData?.cook_time_minutes?.toString() ?? "");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    initialData?.ingredients?.length ? initialData.ingredients : [emptyIngredient()]
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    initialData?.steps?.length ? initialData.steps : [emptyStep(1)]
  );
  const [mep, setMep] = useState<MiseEnPlace[]>(
    initialData?.mise_en_place?.length ? initialData.mise_en_place : []
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
      ingredients: ingredients.filter((i) => i.item.trim()),
      steps: steps
        .filter((s) => s.instruction.trim())
        .map((s, idx) => ({ ...s, order: idx + 1 })),
      mise_en_place: mep.filter((m) => m.ingredient.trim() && m.technique.trim()),
    };

    onSave(data);
  }

  // --- Ingredient helpers ---
  function updateIngredient(idx: number, field: keyof RecipeIngredient, value: unknown) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing))
    );
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  // --- Step helpers ---
  function updateStep(idx: number, instruction: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, instruction } : s))
    );
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })));
  }

  // --- Mise en place helpers ---
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
      {/* Title */}
      <label style={labelStyle}>Título *</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        style={inputStyle}
        placeholder="Nome da receita"
      />

      {/* Source URL */}
      <label style={labelStyle}>URL de origem</label>
      <input
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
        style={inputStyle}
        placeholder="https://... (opcional)"
      />

      {/* Meta row */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
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

      {/* Ingredients */}
      <SectionHeader title="Ingredientes" onAdd={() => setIngredients((p) => [...p, emptyIngredient()])} />
      {ingredients.map((ing, idx) => (
        <div key={idx} style={rowStyle}>
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

      {/* Steps */}
      <SectionHeader title="Modo de Preparo" onAdd={() => setSteps((p) => [...p, emptyStep(p.length + 1)])} />
      {steps.map((step, idx) => (
        <div key={idx} style={rowStyle}>
          <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", minWidth: "24px" }}>{idx + 1}.</span>
          <textarea
            value={step.instruction}
            onChange={(e) => updateStep(idx, e.target.value)}
            style={{ ...inputStyle, flex: 1, marginBottom: 0, minHeight: "48px", resize: "vertical" }}
            placeholder="Instrução do passo"
          />
          <button type="button" onClick={() => removeStep(idx)} style={removeBtnStyle}>×</button>
        </div>
      ))}

      {/* Mise en Place */}
      <SectionHeader title="Mise en Place" onAdd={() => setMep((p) => [...p, emptyMep()])} />
      {mep.map((m, idx) => {
        const entry = findPrepEntry(m.ingredient, m.technique);
        return (
          <div key={idx} style={{ marginBottom: "0.5rem" }}>
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
            {entry && (
              <PrepMetadataRow entry={entry} />
            )}
          </div>
        );
      })}

      {/* Submit */}
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", marginTop: "1rem" }}>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: "var(--color-accent)" }}>{title}</h3>
      <button type="button" onClick={onAdd} style={addBtnStyle}>+ Adicionar</button>
    </div>
  );
}

function PrepMetadataRow({ entry }: { entry: PrepEntry }) {
  const [editing, setEditing] = useState(false);
  const [fridgeDays, setFridgeDays] = useState<string>(entry.fridge_duration_days?.toString() ?? "");
  const [freezable, setFreezable] = useState<string>(
    entry.freezable === true ? "sim" : entry.freezable === false ? "nao" : ""
  );
  const [freezeDays, setFreezeDays] = useState<string>(entry.freeze_duration_days?.toString() ?? "");

  async function handleSaveMeta() {
    await updatePrepEntry(entry.id, {
      fridge_duration_days: fridgeDays ? parseInt(fridgeDays, 10) : null,
      freezable: freezable === "sim" ? true : freezable === "nao" ? false : null,
      freeze_duration_days: freezeDays ? parseInt(freezeDays, 10) : null,
    });
    setEditing(false);
  }

  if (!editing) {
    const parts: string[] = [];
    if (entry.fridge_duration_days != null) parts.push(`Geladeira: ${entry.fridge_duration_days}d`);
    if (entry.freezable === true) parts.push("Pode congelar");
    if (entry.freezable === false) parts.push("Não congelar");
    if (entry.freeze_duration_days != null) parts.push(`Congelado: ${entry.freeze_duration_days}d`);

    return (
      <div style={{ paddingLeft: "0.5rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>
          {parts.length > 0 ? parts.join(" | ") : "Sem dados de conservação"}
        </span>
        <button type="button" onClick={() => setEditing(true)} style={metaEditBtnStyle}>editar</button>
      </div>
    );
  }

  return (
    <div style={{ ...rowStyle, marginTop: "0.25rem", paddingLeft: "0.5rem" }}>
      <input
        type="number"
        value={fridgeDays}
        onChange={(e) => setFridgeDays(e.target.value)}
        style={{ ...inputStyle, width: "80px", marginBottom: 0 }}
        placeholder="Gelad. (d)"
        min={0}
      />
      <select
        value={freezable}
        onChange={(e) => setFreezable(e.target.value)}
        style={{ ...inputStyle, width: "120px", marginBottom: 0 }}
      >
        <option value="">Congela?</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
      <input
        type="number"
        value={freezeDays}
        onChange={(e) => setFreezeDays(e.target.value)}
        style={{ ...inputStyle, width: "80px", marginBottom: 0 }}
        placeholder="Cong. (d)"
        min={0}
      />
      <button type="button" onClick={handleSaveMeta} style={addBtnStyle}>OK</button>
      <button type="button" onClick={() => setEditing(false)} style={removeBtnStyle}>×</button>
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

const metaEditBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--color-accent)",
  fontSize: "0.75rem",
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};
