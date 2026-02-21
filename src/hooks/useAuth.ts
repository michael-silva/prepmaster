import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { handleRedirectResult } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const { setUser, setLoading, setAuthError } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    handleRedirectResult().then((redirectResult) => {
      if (!mounted) return;
      if (redirectResult?.error) {
        setAuthError(redirectResult.error);
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!mounted) return;

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
        setAuthError(null);
      }

      setUser(firebaseUser);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setUser, setLoading, setAuthError]);

  return {
    user: useAuthStore((s) => s.user),
    isLoading: useAuthStore((s) => s.isLoading),
    authError: useAuthStore((s) => s.authError),
  };
}
