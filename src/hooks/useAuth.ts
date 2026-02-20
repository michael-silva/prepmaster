import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const { user, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? null,
            displayName: firebaseUser.displayName ?? null,
            photoURL: firebaseUser.photoURL ?? null,
            createdAt: new Date().toISOString(),
          });
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  return { user, isLoading: useAuthStore((s) => s.isLoading) };
}
