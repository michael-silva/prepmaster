import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { RecipeIngredient } from "@/lib/api";

export async function addRecipeToList(
  uid: string,
  recipeId: string,
  ingredients: RecipeIngredient[]
) {
  const batch = writeBatch(db);
  const colRef = collection(db, "shopping_list");

  for (const ing of ingredients) {
    const ref = doc(colRef);
    batch.set(ref, {
      user_id: uid,
      item: ing.item,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      aisle: ing.aisle ?? null,
      purchased: false,
      purchased_at: null,
      source_recipe_id: recipeId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function addManualItem(uid: string, itemName: string) {
  await addDoc(collection(db, "shopping_list"), {
    user_id: uid,
    item: itemName,
    quantity: null,
    unit: null,
    aisle: null,
    purchased: false,
    purchased_at: null,
    source_recipe_id: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function toggleItem(docId: string, purchased: boolean) {
  await updateDoc(doc(db, "shopping_list", docId), {
    purchased,
    purchased_at: purchased ? serverTimestamp() : null,
    updated_at: serverTimestamp(),
  });
}

export async function removeItem(docId: string) {
  await deleteDoc(doc(db, "shopping_list", docId));
}

export async function clearPurchased(uid: string) {
  const q = query(
    collection(db, "shopping_list"),
    where("user_id", "==", uid),
    where("purchased", "==", true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
