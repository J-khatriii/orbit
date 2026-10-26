import { createBrowserRouter } from "react-router";
import AppLayout from "../components/layout/AppLayout.jsx";
import DashboardPage from "../pages/DashBoardPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";

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
