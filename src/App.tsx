import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useJobTracker } from "@/hooks/useJobTracker";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { NewRecipePage } from "@/pages/NewRecipePage";
import { ToastContainer } from "@/components/Toast";

function App() {
  const { user, isLoading } = useAuth();
  const { activeJobs } = useJobTracker(user);

  if (isLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
        }}
      >
        <div style={{ color: "var(--color-muted)", fontSize: "1.25rem" }}>
          Carregando...
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage user={user} activeJobs={activeJobs} />} />
        <Route path="/nova-receita" element={<NewRecipePage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
