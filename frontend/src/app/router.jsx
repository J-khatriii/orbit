import { createBrowserRouter } from "react-router";
import AppLayout from "../components/layout/AppLayout.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import DesignSystemPage from "../pages/DesignSystemPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

// `handle.title` is what the topbar shows in the breadcrumb.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage />, handle: { title: "Overview" } },
      ...(import.meta.env.DEV
        ? [{ path: "design", element: <DesignSystemPage />, handle: { title: "Design system" } }]
        : []),
      { path: "*", element: <NotFoundPage />, handle: { title: "Page not found" } },
    ],
  },
]);
