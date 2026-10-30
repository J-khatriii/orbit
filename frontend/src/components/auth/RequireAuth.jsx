import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../features/auth/authContext.js";
import ConnectionProblem from "./ConnectionProblem.jsx";
import FullPageLoading from "./FullPageLoading.jsx";

// Wrap any route that needs a signed-in user. Signed-out visitors go to /login, and we
// remember where they were heading so the login screen can send them back.
const RequireAuth = () => {
  const { status, refetch } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullPageLoading />;
  }
  if (status === "error") {
    return <ConnectionProblem onRetry={refetch} />;
  }
  if (status === "signedOut") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
