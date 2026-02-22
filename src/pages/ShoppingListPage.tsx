import { useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { useShoppingList } from "@/hooks/useShoppingList";
import { addManualItem, toggleItems, removeItems, clearPurchased } from "@/lib/shopping";
import { useToastStore } from "@/stores/toastStore";
import { formatConsolidatedLabel, type ConsolidatedItem } from "@/lib/consolidate";

const AISLE_CONFIG: Record<string, { emoji: string; order: number }> = {
  Hortifruti:  { emoji: "🥬", order: 1 },
  "Açougue":   { emoji: "🥩", order: 2 },
  Frios:       { emoji: "🧀", order: 3 },
  "Laticínios": { emoji: "🥛", order: 4 },
  Padaria:     { emoji: "🍞", order: 5 },
  Congelados:  { emoji: "🧊", order: 6 },
  Bebidas:     { emoji: "🥤", order: 7 },
  Mercearia:   { emoji: "🏪", order: 8 },
  Higiene:     { emoji: "🧴", order: 9 },
  Outros:      { emoji: "📦", order: 10 },
};

interface AisleGroup {
  aisle: string;
  emoji: string;
  items: ConsolidatedItem[];
}

function groupByAisle(items: ConsolidatedItem[]): AisleGroup[] {
  const groups = new Map<string, ConsolidatedItem[]>();

  for (const item of items) {
    const aisle = item.aisle ?? "Outros";
    const list = groups.get(aisle);
    if (list) {
      list.push(item);
    } else {
      groups.set(aisle, [item]);
    }
  }

  return Array.from(groups.entries())
    .map(([aisle, grouped]) => ({
      aisle,
      emoji: AISLE_CONFIG[aisle]?.emoji ?? "📦",
      items: grouped,
    }))
    .sort(
      (a, b) =>
        (AISLE_CONFIG[a.aisle]?.order ?? 99) - (AISLE_CONFIG[b.aisle]?.order ?? 99)
    );
}

interface ShoppingListPageProps {
  user: User;
}

export function ShoppingListPage({ user }: ShoppingListPageProps) {
  const { items, consolidated, loading } = useShoppingList(user);
  const addToast = useToastStore((s) => s.addToast);
  const [newItem, setNewItem] = useState("");

  const pending = consolidated.filter((c) => !c.purchased);
  const purchased = consolidated.filter((c) => c.purchased);
  const purchasedRawCount = items.filter((i) => i.purchased).length;
  const aisleGroups = groupByAisle(pending);

  async function handleAdd() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setNewItem("");
    try {
      await addManualItem(user.uid, trimmed);
    } catch {
      addToast("Erro ao adicionar item.", "error");
    }
  }

  async function handleToggle(item: ConsolidatedItem) {
    try {
      await toggleItems(item.docIds, !item.purchased);
    } catch {
      addToast("Erro ao atualizar item.", "error");
    }
  }

  async function handleRemove(item: ConsolidatedItem) {
    try {
      await removeItems(item.docIds);
    } catch {
      addToast("Erro ao remover item.", "error");
    }
  }

  async function handleClearPurchased() {
    if (purchased.length === 0) return;
    try {
      await clearPurchased(user.uid);
      addToast(`${purchasedRawCount} item(ns) removido(s).`, "info");
    } catch {
      addToast("Erro ao limpar comprados.", "error");
    }
  }

  return (
    <main style={{ minHeight: "100vh", padding: "1.5rem", background: "var(--color-bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "var(--color-muted)", textDecoration: "none", fontSize: "1.25rem" }}>
          ←
        </Link>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0, flex: 1 }}>Lista de Compras</h1>
        {consolidated.length > 0 && (
          <span style={{ color: "var(--color-muted)", fontSize: "0.85rem" }}>
            {purchased.length}/{consolidated.length}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Adicionar item..."
          style={inputStyle}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          style={addBtnStyle(!newItem.trim())}
        >
          +
        </button>
      </div>

      {loading && (
        <p style={{ color: "var(--color-muted)", fontSize: "0.95rem" }}>Carregando lista...</p>
      )}

      {!loading && consolidated.length === 0 && (
        <section style={cardStyle}>
          <p style={{ color: "var(--color-muted)", fontSize: "0.95rem", margin: 0, textAlign: "center", padding: "1rem 0" }}>
            Sua lista está vazia. Adicione itens acima ou a partir de uma receita.
          </p>
        </section>
      )}

      {aisleGroups.map((group) => (
        <section key={group.aisle} style={{ marginBottom: "1.25rem" }}>
          <div style={aisleHeaderStyle}>
            <span style={{ fontSize: "1.1rem" }}>{group.emoji}</span>
            <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{group.aisle}</span>
            <span style={aisleCountStyle}>{group.items.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {group.items.map((item) => (
              <ItemRow
                key={item.key}
                item={item}
                onToggle={() => handleToggle(item)}
                onRemove={() => handleRemove(item)}
              />
            ))}
          </div>
        </section>
      ))}

      {purchased.length > 0 && (
        <section>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}>
            <span style={{ color: "var(--color-muted)", fontSize: "0.85rem", fontWeight: 500 }}>
              Comprados ({purchased.length})
            </span>
            <button
              type="button"
              onClick={handleClearPurchased}
              style={clearBtnStyle}
            >
              Limpar comprados
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {purchased.map((item) => (
              <ItemRow
                key={item.key}
                item={item}
                onToggle={() => handleToggle(item)}
                onRemove={() => handleRemove(item)}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

interface ItemRowProps {
  item: ConsolidatedItem;
  onToggle: () => void;
  onRemove: () => void;
}

function ItemRow({ item, onToggle, onRemove }: ItemRowProps) {
  const label = formatConsolidatedLabel(item);
  const mergedCount = item.docIds.length;

  return (
    <div style={rowStyle}>
      <button
        type="button"
        onClick={onToggle}
        style={checkboxStyle(item.purchased)}
        aria-label={item.purchased ? "Desmarcar" : "Marcar como comprado"}
      >
        {item.purchased && "✓"}
      </button>
      <div style={{ flex: 1, minWidth: 0 }} onClick={onToggle}>
        <span
          style={{
            fontSize: "0.95rem",
            textDecoration: item.purchased ? "line-through" : "none",
            color: item.purchased ? "var(--color-muted)" : "var(--color-text)",
            opacity: item.purchased ? 0.6 : 1,
          }}
        >
          {label}
        </span>
        {mergedCount > 1 && (
          <span style={badgeStyle}>
            {mergedCount}x
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        style={removeBtnStyle}
        aria-label="Remover"
      >
        ×
      </button>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  borderRadius: "12px",
  padding: "1.5rem",
  border: "1px solid rgba(124, 184, 130, 0.2)",
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "0.75rem 1rem",
  fontSize: "1rem",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  border: "1px solid rgba(124, 184, 130, 0.3)",
  borderRadius: "10px",
  boxSizing: "border-box",
};

const addBtnStyle = (disabled: boolean): React.CSSProperties => ({
  width: "48px",
  height: "48px",
  fontSize: "1.5rem",
  fontWeight: 600,
  background: "var(--color-accent)",
  color: "var(--color-bg)",
  border: "none",
  borderRadius: "10px",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
  flexShrink: 0,
});

const aisleHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.6rem 0.25rem",
  color: "var(--color-text)",
};

const aisleCountStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--color-muted)",
  background: "rgba(124, 184, 130, 0.15)",
  borderRadius: "10px",
  padding: "1px 7px",
  fontWeight: 500,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.75rem",
  padding: "0.75rem 1rem",
  background: "var(--color-surface)",
  borderRadius: "8px",
  marginBottom: "2px",
};

const checkboxStyle = (checked: boolean): React.CSSProperties => ({
  width: "28px",
  height: "28px",
  borderRadius: "50%",
  border: checked
    ? "2px solid var(--color-accent)"
    : "2px solid rgba(124, 184, 130, 0.4)",
  background: checked ? "var(--color-accent)" : "transparent",
  color: "var(--color-bg)",
  fontSize: "0.85rem",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  padding: 0,
});

const badgeStyle: React.CSSProperties = {
  marginLeft: "0.5rem",
  fontSize: "0.75rem",
  color: "var(--color-muted)",
  background: "rgba(124, 184, 130, 0.15)",
  borderRadius: "4px",
  padding: "1px 5px",
  fontWeight: 500,
  verticalAlign: "middle",
};

const removeBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--color-muted)",
  fontSize: "1.25rem",
  cursor: "pointer",
  padding: "0 0.25rem",
  opacity: 0.6,
  flexShrink: 0,
};

const clearBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(124, 184, 130, 0.3)",
  color: "var(--color-muted)",
  fontSize: "0.8rem",
  borderRadius: "6px",
  padding: "0.35rem 0.75rem",
  cursor: "pointer",
};
