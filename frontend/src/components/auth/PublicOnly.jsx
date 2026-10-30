import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../features/auth/authContext.js";
import ConnectionProblem from "./ConnectionProblem.jsx";
import FullPageLoading from "./FullPageLoading.jsx";

// For pages like /login that make no sense once you're signed in.
const PublicOnly = () => {
  const { status, refetch } = useAuth();

  if (status === "loading") {
    return <FullPageLoading />;
  }
  if (status === "error") {
    return <ConnectionProblem onRetry={refetch} />;
  }
  if (status === "signedIn") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PublicOnly;
