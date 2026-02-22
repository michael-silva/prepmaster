import { useState } from "react";
import type { PrepEntry } from "@/lib/prepCatalog";
import { updatePrepEntry } from "@/lib/prepCatalog";

interface PrepMetadataRowProps {
  entry: PrepEntry;
}

export function PrepMetadataRow({ entry }: PrepMetadataRowProps) {
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

const metaEditBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--color-accent)",
  fontSize: "0.75rem",
  cursor: "pointer",
  textDecoration: "underline",
  padding: 0,
};
