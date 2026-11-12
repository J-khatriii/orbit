import { Navigate } from "react-router";
import DashboardPage from "../../pages/DashboardPage.jsx";
import { useAuth } from "../../features/auth/authContext.js";

const RoleHome = () => {
  const { activeWorkspace } = useAuth();

  if (activeWorkspace?.role === "client") {
    return <Navigate to="/portal" replace />;
  }

  return <DashboardPage />;
};

export default RoleHome;
