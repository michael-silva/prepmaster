import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { Recipe } from "@/lib/api";

export interface StoredRecipe extends Recipe {
  id: string;
  created_at?: { seconds: number };
}

export function useRecipes(user: User | null) {
  const [recipes, setRecipes] = useState<StoredRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecipes([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "recipes"),
      where("user_id", "==", user.uid),
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: StoredRecipe[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<StoredRecipe, "id">),
        }));
        setRecipes(items);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { recipes, loading };
}
