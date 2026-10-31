import { createBrowserRouter } from "react-router";
import PublicOnly from "../components/auth/PublicOnly.jsx";
import RequireAuth from "../components/auth/RequireAuth.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import DesignSystemPage from "../pages/DesignSystemPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import AuthPlaceholderPage from "../pages/auth/AuthPlaceholderPage.jsx";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage.jsx";
import SignupPage from "../pages/auth/SignupPage.jsx";
import VerifyEmailPage from "../pages/auth/VerifyEmailPage.jsx";

// `handle.title` is what the topbar shows in the breadcrumb.
export const router = createBrowserRouter([
  {
    // Everything for people who aren't signed in (or don't have to be).
    element: <AuthLayout />,
    children: [
      {
        // Signed-in people are sent to the app instead.
        element: <PublicOnly />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "signup", element: <SignupPage /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
        ],
      },
      // These work signed in or out, because an email link can be opened either way.
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      {
        path: "accept-invite",
        element: (
          <AuthPlaceholderPage
            title="Join a workspace"
            description="The invitation screen arrives in 2.10."
          />
        ),
      },
    ],
  },
  {
    // The app itself. Anyone not signed in is sent to /login.
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage />, handle: { title: "Overview" } },
          ...(import.meta.env.DEV
            ? [
                {
                  path: "design",
                  element: <DesignSystemPage />,
                  handle: { title: "Design system" },
                },
              ]
            : []),
          { path: "*", element: <NotFoundPage />, handle: { title: "Page not found" } },
        ],
      },
    ],
  },
]);
