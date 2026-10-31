import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../features/auth/authContext.js";
import ConnectionProblem from "./ConnectionProblem.jsx";
import FullPageLoading from "./FullPageLoading.jsx";

// For pages like /login that make no sense once you're signed in.
// RequireAuth leaves the page you were heading to in `location.state.from`, so right
// after signing in we send you there instead of the dashboard.
const PublicOnly = () => {
  const { status, refetch } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <FullPageLoading />;
  }
  if (status === "error") {
    return <ConnectionProblem onRetry={refetch} />;
  }
  if (status === "signedIn") {
    return <Navigate to={location.state?.from ?? "/"} replace />;
  }

  return <Outlet />;
};

export default PublicOnly;
