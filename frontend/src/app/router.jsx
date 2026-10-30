import { createBrowserRouter } from "react-router";
import PublicOnly from "../components/auth/PublicOnly.jsx";
import RequireAuth from "../components/auth/RequireAuth.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import DesignSystemPage from "../pages/DesignSystemPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import AuthPlaceholderPage from "../pages/auth/AuthPlaceholderPage.jsx";

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
          {
            path: "login",
            element: (
              <AuthPlaceholderPage title="Sign in" description="The sign-in form arrives in 2.8." />
            ),
          },
          {
            path: "signup",
            element: (
              <AuthPlaceholderPage title="Create account" description="Signup arrives in 2.8." />
            ),
          },
          {
            path: "forgot-password",
            element: (
              <AuthPlaceholderPage
                title="Forgot password"
                description="The reset request form arrives in 2.8."
              />
            ),
          },
        ],
      },
      // These work signed in or out, because an email link can be opened either way.
      {
        path: "reset-password",
        element: (
          <AuthPlaceholderPage
            title="Choose a new password"
            description="The reset form arrives in 2.8."
          />
        ),
      },
      {
        path: "verify-email",
        element: (
          <AuthPlaceholderPage
            title="Confirm your email"
            description="The confirmation screen arrives in 2.8."
          />
        ),
      },
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
