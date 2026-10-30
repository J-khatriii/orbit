import { createContext, useContext } from "react";

export const AuthContext = createContext(null);

// status is one of:
//   "loading"    asking the server who is signed in
//   "signedIn"   user and workspaces are available
//   "signedOut"  no session
//   "error"      the server couldn't be reached
export const useAuth = () => {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }

  return value;
};
