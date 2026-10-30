import { Link } from "react-router";
import { Card } from "../../components/ui/index.js";

const LINKS = [
  { to: "/login", label: "Sign in" },
  { to: "/signup", label: "Sign up" },
  { to: "/forgot-password", label: "Forgot password" },
  { to: "/reset-password", label: "Reset password" },
  { to: "/verify-email", label: "Verify email" },
  { to: "/accept-invite", label: "Accept invite" },
];

// Temporary: Step 2.8 replaces each of these with the real screen.
const AuthPlaceholderPage = ({ title, description }) => {
  return (
    <Card eyebrow="Placeholder" title={title}>
      <p className="text-sm text-ink-soft">{description}</p>
      <nav aria-label="Auth pages" className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {LINKS.map((link) => {
          return (
            <Link key={link.to} to={link.to} className="text-brand-700 hover:underline">
              {link.label}
            </Link>
          );
        })}
      </nav>
    </Card>
  );
};

export default AuthPlaceholderPage;
