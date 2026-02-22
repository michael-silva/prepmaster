import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { PrepEntry } from "@/lib/prepCatalog";

export function usePrepCatalog(user: User | null) {
  const [entries, setEntries] = useState<PrepEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "prep_catalog"),
      where("user_id", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: PrepEntry[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PrepEntry, "id">),
        }));
        setEntries(items);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { entries, loading };
}
