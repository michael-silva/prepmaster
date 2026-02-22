import type { ShoppingItem } from "@/hooks/useShoppingList";

export interface ConsolidatedEntry {
  quantity: number | null;
  unit: string | null;
  docIds: string[];
}

export interface ConsolidatedItem {
  key: string;
  displayName: string;
  entries: ConsolidatedEntry[];
  totalQuantity: number | null;
  totalUnit: string | null;
  isCompatible: boolean;
  purchased: boolean;
  aisle: string | null;
  docIds: string[];
}

type UnitFamily = "mass" | "volume";

interface UnitDef {
  family: UnitFamily;
  toBase: number;
}

const UNIT_MAP: Record<string, UnitDef> = {
  mg: { family: "mass", toBase: 0.001 },
  g: { family: "mass", toBase: 1 },
  kg: { family: "mass", toBase: 1000 },

  ml: { family: "volume", toBase: 1 },
  l: { family: "volume", toBase: 1000 },
};

const DISPLAY_UNITS: Record<UnitFamily, { small: string; big: string; threshold: number }> = {
  mass: { small: "g", big: "kg", threshold: 1000 },
  volume: { small: "ml", big: "L", threshold: 1000 },
};

function normalizeUnit(unit: string): string {
  return unit.trim().toLowerCase().replace(/\.$/, "");
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatBaseValue(value: number, family: UnitFamily): { quantity: number; unit: string } {
  const { small, big, threshold } = DISPLAY_UNITS[family];
  if (value >= threshold) {
    const converted = value / threshold;
    return { quantity: parseFloat(converted.toFixed(2)), unit: big };
  }
  return { quantity: parseFloat(value.toFixed(2)), unit: small };
}

function resolveUnit(unit: string | null): UnitDef | null {
  if (!unit) return null;
  return UNIT_MAP[normalizeUnit(unit)] ?? null;
}

function tryConsolidateGroup(entries: ConsolidatedEntry[]): {
  isCompatible: boolean;
  totalQuantity: number | null;
  totalUnit: string | null;
  mergedEntries: ConsolidatedEntry[];
} {
  if (entries.length === 1) {
    const e = entries[0];
    return {
      isCompatible: true,
      totalQuantity: e.quantity,
      totalUnit: e.unit,
      mergedEntries: entries,
    };
  }

  const allNull = entries.every((e) => e.quantity == null);
  if (allNull) {
    const merged: ConsolidatedEntry = {
      quantity: null,
      unit: null,
      docIds: entries.flatMap((e) => e.docIds),
    };
    return { isCompatible: true, totalQuantity: null, totalUnit: null, mergedEntries: [merged] };
  }

  const withQty = entries.filter((e) => e.quantity != null);
  const withoutQty = entries.filter((e) => e.quantity == null);

  const unitDefs = withQty.map((e) => ({ entry: e, def: resolveUnit(e.unit) }));

  const families = new Set(
    unitDefs.map((u) => {
      if (u.def) return `metric:${u.def.family}`;
      return `raw:${normalizeUnit(u.entry.unit ?? "")}`;
    })
  );

  if (families.size === 1 && withoutQty.length === 0) {
    const first = unitDefs[0];

    if (first.def) {
      let baseSum = 0;
      for (const { entry, def } of unitDefs) {
        baseSum += (entry.quantity ?? 0) * def!.toBase;
      }
      const { quantity, unit } = formatBaseValue(baseSum, first.def.family);
      const allDocIds = entries.flatMap((e) => e.docIds);
      return {
        isCompatible: true,
        totalQuantity: quantity,
        totalUnit: unit,
        mergedEntries: [{ quantity, unit, docIds: allDocIds }],
      };
    }

    let sum = 0;
    for (const e of withQty) {
      sum += e.quantity!;
    }
    const allDocIds = entries.flatMap((e) => e.docIds);
    const roundedSum = parseFloat(sum.toFixed(2));
    return {
      isCompatible: true,
      totalQuantity: roundedSum,
      totalUnit: withQty[0].unit,
      mergedEntries: [{ quantity: roundedSum, unit: withQty[0].unit, docIds: allDocIds }],
    };
  }

  return {
    isCompatible: false,
    totalQuantity: null,
    totalUnit: null,
    mergedEntries: entries,
  };
}

export function consolidateItems(items: ShoppingItem[]): ConsolidatedItem[] {
  const groups = new Map<
    string,
    { displayName: string; aisle: string | null; entries: ConsolidatedEntry[]; purchased: boolean }
  >();

  for (const item of items) {
    const key = normalizeName(item.item);

    let group = groups.get(key);
    if (!group) {
      group = {
        displayName: item.item,
        aisle: item.aisle,
        entries: [],
        purchased: true,
      };
      groups.set(key, group);
    }

    if (!item.purchased) {
      group.purchased = false;
    }

    if (item.aisle && !group.aisle) {
      group.aisle = item.aisle;
    }

    const normalizedUnit = item.unit ? normalizeUnit(item.unit) : null;
    const existing = group.entries.find(
      (e) =>
        e.quantity === item.quantity &&
        (e.unit ? normalizeUnit(e.unit) : null) === normalizedUnit
    );

    if (existing) {
      existing.docIds.push(item.id);
    } else {
      group.entries.push({
        quantity: item.quantity,
        unit: item.unit,
        docIds: [item.id],
      });
    }
  }

  const result: ConsolidatedItem[] = [];

  for (const [key, group] of groups) {
    const { isCompatible, totalQuantity, totalUnit, mergedEntries } = tryConsolidateGroup(
      group.entries
    );

    result.push({
      key,
      displayName: group.displayName,
      entries: mergedEntries,
      totalQuantity,
      totalUnit,
      isCompatible,
      purchased: group.purchased,
      aisle: group.aisle,
      docIds: group.entries.flatMap((e) => e.docIds),
    });
  }

  return result;
}

export function formatConsolidatedLabel(item: ConsolidatedItem): string {
  if (item.isCompatible) {
    const parts: string[] = [];
    if (item.totalQuantity != null) parts.push(String(item.totalQuantity));
    if (item.totalUnit) parts.push(item.totalUnit);
    parts.push(item.displayName);
    return parts.join(" ");
  }

  const portions = item.entries
    .map((e) => {
      const parts: string[] = [];
      if (e.quantity != null) parts.push(String(e.quantity));
      if (e.unit) parts.push(e.unit);
      return parts.length > 0 ? parts.join(" ") : "?";
    })
    .join(" + ");

  return `${item.displayName} (${portions})`;
}
