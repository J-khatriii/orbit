import { createBrowserRouter } from "react-router";
import AppLayout from "../components/layout/AppLayout.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
