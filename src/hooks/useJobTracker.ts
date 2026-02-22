import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useToastStore } from "@/stores/toastStore";

export interface ActiveJob {
  jobId: string;
  url: string;
  status: "pending" | "processing";
}

export function useJobTracker(user: User | null) {
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const addToast = useToastStore((s) => s.addToast);
  const missedCheckDone = useRef(false);
  const isFirstSnapshot = useRef(true);

  useEffect(() => {
    if (!user) {
      setActiveJobs([]);
      return;
    }

    const uid = user.uid;
    isFirstSnapshot.current = true;

    const activeQuery = query(
      collection(db, "jobs"),
      where("user_id", "==", uid),
      where("status", "in", ["pending", "processing"])
    );

    const unsubscribe = onSnapshot(activeQuery, (snapshot) => {
      // Skip toasts for the initial snapshot (existing pending jobs)
      if (!isFirstSnapshot.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "removed") {
            handleJobRemoved(change.doc.id, addToast);
          }
        });
      }
      isFirstSnapshot.current = false;

      const jobs: ActiveJob[] = snapshot.docs.map((d) => {
        const data = d.data();
        return { jobId: d.id, url: data.url, status: data.status };
      });

      setActiveJobs(jobs);
    });

    return () => unsubscribe();
  }, [user?.uid, addToast]);

  useEffect(() => {
    if (!user || missedCheckDone.current) return;
    missedCheckDone.current = true;
    checkMissedJobs(user.uid, addToast);
  }, [user?.uid, addToast]);

  return { activeJobs };
}

async function handleJobRemoved(
  jobId: string,
  addToast: (msg: string, type?: "success" | "error" | "info") => void
) {
  try {
    const snap = await getDoc(doc(db, "jobs", jobId));
    if (!snap.exists()) return;
    const data = snap.data();

    if (data.status === "completed") {
      const title = data.recipe_title || "Receita";
      addToast(`${title} importada com sucesso!`, "success");
    } else if (data.status === "failed") {
      addToast(data.error || "Extração falhou.", "error");
    }
    markNotified(jobId);
  } catch {
    // Silently ignore — security rules may block if user mismatch
  }
}

function markNotified(jobId: string) {
  const jobRef = doc(db, "jobs", jobId);
  updateDoc(jobRef, { notified_at: serverTimestamp() }).catch(() => {});
}

async function checkMissedJobs(
  uid: string,
  addToast: (msg: string, type?: "success" | "error" | "info") => void
) {
  try {
    const missedQuery = query(
      collection(db, "jobs"),
      where("user_id", "==", uid),
      where("status", "==", "completed"),
      where("notified_at", "==", null),
      orderBy("completed_at", "desc"),
      limit(10)
    );

    const snap = await getDocs(missedQuery);
    snap.docs.forEach((d) => {
      const data = d.data();
      const title = data.recipe_title || "Receita";
      addToast(`${title} importada enquanto você estava fora!`, "success");
      markNotified(d.id);
    });
  } catch {
    // Index may not exist yet -- Firestore SDK logs the creation link
  }
}
