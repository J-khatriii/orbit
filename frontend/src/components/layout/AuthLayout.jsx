import { Outlet } from "react-router";
import OrbitLogo from "./OrbitLogo.jsx";

// The frame around every signed-out screen: logo, a centred card, a quiet footer line.
const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12 text-ink">
      <OrbitLogo />
      <main className="mt-10 w-full max-w-md">
        <Outlet />
      </main>
      <p className="mt-10 text-xs text-ink-muted">Your work, a little more together.</p>
    </div>
  );
};

export default AuthLayout;
