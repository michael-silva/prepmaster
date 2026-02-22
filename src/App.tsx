import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useJobTracker } from "@/hooks/useJobTracker";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { NewRecipePage } from "@/pages/NewRecipePage";
import { ShoppingListPage } from "@/pages/ShoppingListPage";
import { CreateRecipePage } from "@/pages/CreateRecipePage";
import { EditRecipePage } from "@/pages/EditRecipePage";
import { ToastContainer } from "@/components/Toast";

function App() {
  const { user, isLoading } = useAuth();
  const { activeJobs } = useJobTracker(user);

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-muted text-xl">Carregando...</div>
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
        <Route path="/criar-receita" element={<CreateRecipePage user={user} />} />
        <Route path="/editar-receita/:id" element={<EditRecipePage user={user} />} />
        <Route path="/lista-de-compras" element={<ShoppingListPage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App;
