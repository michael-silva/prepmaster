import { useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import * as Accordion from "@radix-ui/react-accordion";
import { useShoppingList } from "@/hooks/useShoppingList";
import { addManualItem, toggleItems, removeItems, clearPurchased } from "@/lib/shopping";
import { useToastStore } from "@/stores/toastStore";
import { formatConsolidatedLabel, type ConsolidatedItem } from "@/lib/consolidate";

const AISLE_CONFIG: Record<string, { emoji: string; order: number }> = {
  Hortifruti:    { emoji: "🥬", order: 1 },
  "Açougue":     { emoji: "🥩", order: 2 },
  Frios:         { emoji: "🧀", order: 3 },
  "Laticínios":  { emoji: "🥛", order: 4 },
  Padaria:       { emoji: "🍞", order: 5 },
  Congelados:    { emoji: "🧊", order: 6 },
  Bebidas:       { emoji: "🥤", order: 7 },
  Mercearia:     { emoji: "🏪", order: 8 },
  Higiene:       { emoji: "🧴", order: 9 },
  Outros:        { emoji: "📦", order: 10 },
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

  const allAisles = aisleGroups.map((g) => g.aisle);

  return (
    <main className="min-h-screen p-6 bg-bg">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="text-muted no-underline text-xl">←</Link>
        <h1 className="text-2xl font-semibold m-0 flex-1">Lista de Compras</h1>
        {consolidated.length > 0 && (
          <span className="text-muted text-sm">
            {purchased.length}/{consolidated.length}
          </span>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Adicionar item..."
          className="flex-1 px-4 py-3 text-base bg-surface text-text border border-border rounded-lg focus:outline-none focus:border-accent transition-colors"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="w-12 h-12 text-2xl font-semibold bg-accent text-bg border-none rounded-lg cursor-pointer shrink-0 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110 transition"
        >
          +
        </button>
      </div>

      {loading && (
        <p className="text-muted text-[0.95rem]">Carregando lista...</p>
      )}

      {!loading && consolidated.length === 0 && (
        <section className="bg-surface rounded-xl p-6 border border-border">
          <p className="text-muted text-[0.95rem] m-0 text-center py-4">
            Sua lista está vazia. Adicione itens acima ou a partir de uma receita.
          </p>
        </section>
      )}

      {aisleGroups.length > 0 && (
        <Accordion.Root type="multiple" defaultValue={allAisles}>
          {aisleGroups.map((group) => (
            <Accordion.Item key={group.aisle} value={group.aisle} className="mb-5">
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center gap-2 px-1 py-2.5 text-text bg-transparent border-none cursor-pointer group">
                  <span className="text-lg">{group.emoji}</span>
                  <span className="font-semibold text-sm">{group.aisle}</span>
                  <span className="text-xs text-muted bg-accent-soft rounded-lg px-2 py-0.5 font-medium">
                    {group.items.length}
                  </span>
                  <svg
                    className="ml-auto w-4 h-4 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=open]:animate-[slideDown_200ms_ease-out] data-[state=closed]:animate-[slideUp_200ms_ease-out]">
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <ItemRow
                      key={item.key}
                      item={item}
                      onToggle={() => handleToggle(item)}
                      onRemove={() => handleRemove(item)}
                    />
                  ))}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      )}

      {purchased.length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted text-sm font-medium">
              Comprados ({purchased.length})
            </span>
            <button
              type="button"
              onClick={handleClearPurchased}
              className="bg-transparent border border-accent/30 text-muted text-sm rounded-md px-3 py-1.5 cursor-pointer hover:border-accent hover:text-accent transition-colors"
            >
              Limpar comprados
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
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
    <div className="flex items-center gap-3 px-4 py-3 bg-surface rounded-lg mb-0.5">
      <button
        type="button"
        onClick={onToggle}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 p-0 text-sm font-bold transition-colors ${
          item.purchased
            ? "border-accent bg-accent text-bg"
            : "border-accent/40 bg-transparent text-bg"
        }`}
        aria-label={item.purchased ? "Desmarcar" : "Marcar como comprado"}
      >
        {item.purchased && "✓"}
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggle}>
        <span
          className={`text-[0.95rem] transition-colors ${
            item.purchased
              ? "line-through text-muted opacity-60"
              : "text-text"
          }`}
        >
          {label}
        </span>
        {mergedCount > 1 && (
          <span className="ml-2 text-xs text-muted bg-accent-soft rounded px-1.5 py-0.5 font-medium align-middle">
            {mergedCount}x
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="bg-transparent border-none text-muted text-xl cursor-pointer px-1 opacity-60 shrink-0 hover:opacity-100 hover:text-error transition-colors"
        aria-label="Remover"
      >
        ×
      </button>
    </div>
  );
}
