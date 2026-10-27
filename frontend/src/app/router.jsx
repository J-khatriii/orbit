import { createBrowserRouter } from "react-router";
import AppLayout from "../components/layout/AppLayout.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import DesignSystemPage from "../pages/DesignSystemPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      ...(import.meta.env.DEV ? [{ path: "design", element: <DesignSystemPage /> }] : []),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
