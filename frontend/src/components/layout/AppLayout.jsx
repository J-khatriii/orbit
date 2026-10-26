import { Outlet } from "react-router";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
