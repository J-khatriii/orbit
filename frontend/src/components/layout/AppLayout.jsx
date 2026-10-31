import { Outlet } from "react-router";
import VerifyEmailBanner from "../auth/VerifyEmailBanner.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <VerifyEmailBanner />
        <Topbar />
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-6 py-10 md:px-10">
          <div className="flex-1">
            <Outlet />
          </div>
          <p className="mt-16 text-xs text-ink-muted">Your work, a little more together.</p>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
