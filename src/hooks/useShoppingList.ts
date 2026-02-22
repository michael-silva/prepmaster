import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { consolidateItems, type ConsolidatedItem } from "@/lib/consolidate";

export interface ShoppingItem {
  id: string;
  item: string;
  quantity: number | null;
  unit: string | null;
  aisle: string | null;
  purchased: boolean;
  purchased_at: { seconds: number } | null;
  source_recipe_id: string | null;
  created_at: { seconds: number } | null;
}

export function useShoppingList(user: User | null) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "shopping_list"),
      where("user_id", "==", user.uid),
      orderBy("created_at", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const result: ShoppingItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ShoppingItem, "id">),
        }));
        setItems(result);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const consolidated: ConsolidatedItem[] = useMemo(
    () => consolidateItems(items),
    [items]
  );

  return { items, consolidated, loading };
}
