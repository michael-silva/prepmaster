import { useState } from "react";
import type { PrepEntry } from "@/lib/prepCatalog";
import { updatePrepEntry } from "@/lib/prepCatalog";

const INPUT_CLS = "px-3 py-2.5 text-[0.95rem] bg-bg text-text border border-border rounded-lg w-full focus:outline-none focus:border-accent transition-colors";

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
      <div className="pl-2 mt-1 flex items-center gap-2">
        <span className="text-muted text-sm">
          {parts.length > 0 ? parts.join(" | ") : "Sem dados de conservação"}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="bg-transparent border-none text-accent text-xs cursor-pointer underline p-0"
        >
          editar
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center mt-1 pl-2">
      <input
        type="number"
        value={fridgeDays}
        onChange={(e) => setFridgeDays(e.target.value)}
        className={`${INPUT_CLS} !w-20`}
        placeholder="Gelad. (d)"
        min={0}
      />
      <select
        value={freezable}
        onChange={(e) => setFreezable(e.target.value)}
        className={`${INPUT_CLS} !w-[120px]`}
      >
        <option value="">Congela?</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
      <input
        type="number"
        value={freezeDays}
        onChange={(e) => setFreezeDays(e.target.value)}
        className={`${INPUT_CLS} !w-20`}
        placeholder="Cong. (d)"
        min={0}
      />
      <button type="button" onClick={handleSaveMeta} className="bg-transparent border border-accent/40 text-accent text-sm font-medium rounded-md px-2.5 py-1 cursor-pointer hover:bg-accent/10 transition-colors">
        OK
      </button>
      <button type="button" onClick={() => setEditing(false)} className="bg-transparent border-none text-muted text-xl cursor-pointer px-1 shrink-0 hover:text-error transition-colors">
        ×
      </button>
    </div>
  );
}
