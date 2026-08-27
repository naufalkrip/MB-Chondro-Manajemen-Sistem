import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function ProtectedRoute({ children }: { children?: JSX.Element }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirect to /login
    return <Navigate to="/login" replace />;
  }

  return children ?? <Outlet />;
}
