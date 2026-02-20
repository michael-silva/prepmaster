import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";

function App() {
  const { user, isLoading } = useAuth();

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

  return user ? <HomePage user={user} /> : <LoginPage />;
}

export default App;
