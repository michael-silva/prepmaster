import {
  collection,
  doc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MiseEnPlace } from "@/lib/api";

export interface PrepEntry {
  id: string;
  user_id: string;
  ingredient: string;
  technique: string;
  fridge_duration_days: number | null;
  freezable: boolean | null;
  freeze_duration_days: number | null;
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

export async function syncPrepCatalog(uid: string, miseEnPlace: MiseEnPlace[]) {
  if (miseEnPlace.length === 0) return;

  const existingSnap = await getDocs(
    query(collection(db, "prep_catalog"), where("user_id", "==", uid))
  );

  const existingKeys = new Set<string>();
  existingSnap.docs.forEach((d) => {
    const data = d.data();
    existingKeys.add(`${normalizeKey(data.ingredient)}::${normalizeKey(data.technique)}`);
  });

  const promises: Promise<unknown>[] = [];
  for (const item of miseEnPlace) {
    const key = `${normalizeKey(item.ingredient)}::${normalizeKey(item.technique)}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);

    promises.push(
      addDoc(collection(db, "prep_catalog"), {
        user_id: uid,
        ingredient: item.ingredient,
        technique: item.technique,
        fridge_duration_days: null,
        freezable: null,
        freeze_duration_days: null,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      })
    );
  }

  await Promise.all(promises);
}

export async function updatePrepEntry(
  docId: string,
  data: {
    fridge_duration_days?: number | null;
    freezable?: boolean | null;
    freeze_duration_days?: number | null;
  }
) {
  await updateDoc(doc(db, "prep_catalog", docId), {
    ...data,
    updated_at: serverTimestamp(),
  });
}
