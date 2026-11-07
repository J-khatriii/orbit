import { createBrowserRouter } from "react-router";
import PublicOnly from "../components/auth/PublicOnly.jsx";
import RequireAuth from "../components/auth/RequireAuth.jsx";
import RequireOnboarded from "../components/auth/RequireOnboarded.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import AuthLayout from "../components/layout/AuthLayout.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import DesignSystemPage from "../pages/DesignSystemPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import WelcomePage from "../pages/WelcomePage.jsx";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage.jsx";
import LoginPage from "../pages/auth/LoginPage.jsx";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage.jsx";
import SignupPage from "../pages/auth/SignupPage.jsx";
import VerifyEmailPage from "../pages/auth/VerifyEmailPage.jsx";
import AcceptInvitePage from "../pages/auth/AcceptInvitePage.jsx";
import TeamPage from "../pages/TeamPage.jsx";
import ClientsPage from "../pages/ClientsPage.jsx";
import ClientPage from "../pages/ClientPage.jsx";
import ProjectsPage from "../pages/ProjectsPage.jsx";
import ProjectPage from "../pages/ProjectPage.jsx";

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
      { path: "accept-invite", element: <AcceptInvitePage /> },
    ],
  },
  {
    // Signed-in only. Anyone not signed in is sent to /login.
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        // First-run setup for new workspace owners.
        path: "welcome",
        element: <AuthLayout />,
        children: [{ index: true, element: <WelcomePage /> }],
      },
      {
        // The app itself. Owners of a workspace that isn't set up yet are sent to /welcome.
        element: <RequireOnboarded />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <DashboardPage />, handle: { title: "Overview" } },
              { path: "team", element: <TeamPage />, handle: { title: "Team" } },
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
              { path: "clients", element: <ClientsPage />, handle: { title: "Clients" } },
              { path: "clients/:clientId", element: <ClientPage />, handle: { title: "Client" } },
              { path: "projects", element: <ProjectsPage />, handle: { title: "Projects" } },
              {
                path: "projects/:projectId",
                element: <ProjectPage />,
                handle: { title: "Project" },
              },
            ],
          },
        ],
      },
    ],
  },
]);
