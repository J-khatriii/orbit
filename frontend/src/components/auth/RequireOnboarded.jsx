import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../features/auth/authContext.js";

// Sits in front of the app. A workspace owner whose workspace isn't set up yet is sent to
// the wizard first. Everyone else (admins, members, clients) goes straight in.
const RequireOnboarded = () => {
  const { activeWorkspace } = useAuth();

  if (activeWorkspace && activeWorkspace.role === "owner" && !activeWorkspace.onboarded) {
    return <Navigate to="/welcome" replace />;
  }

  return <Outlet />;
};

export default RequireOnboarded;
