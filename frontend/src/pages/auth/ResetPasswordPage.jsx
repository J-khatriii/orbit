import { useNavigate, useSearchParams } from "react-router";
import AuthCard from "../../components/auth/AuthCard.jsx";
import AuthLink from "../../components/auth/AuthLink.jsx";
import FormError from "../../components/auth/FormError.jsx";
import { Button, Input } from "../../components/ui/index.js";
import { useResetPassword } from "../../features/auth/useAuthActions.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { validateResetPassword } from "../../features/auth/validation.js";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const form = useAuthForm({ password: "", confirmPassword: "" });
  const reset = useResetPassword();
  const navigate = useNavigate();

  const submit = (values, options) => {
    reset.mutate({ token, password: values.password }, options);
  };

  if (!token) {
    return (
      <AuthCard
        title="This link isn't valid."
        subtitle="It may be incomplete. Request a new one and we'll send it right over."
      >
        <AuthLink to="/forgot-password">Request a new link</AuthLink>
      </AuthCard>
    );
  }

  if (reset.isSuccess) {
    return (
      <AuthCard
        title="Password updated."
        subtitle="For your safety you've been signed out everywhere. Sign in with your new password."
      >
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            navigate("/login");
          }}
        >
          Sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password." subtitle="Pick something you haven't used before.">
      <form
        noValidate
        onSubmit={form.handleSubmit(validateResetPassword, submit)}
        className="space-y-5"
      >
        <FormError message={form.formError} />
        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters."
          value={form.values.password}
          onChange={form.handleChange("password")}
          error={form.errors.password}
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={form.values.confirmPassword}
          onChange={form.handleChange("confirmPassword")}
          error={form.errors.confirmPassword}
        />
        <Button type="submit" size="lg" loading={reset.isPending} className="w-full">
          Update password
        </Button>
        {form.formError && (
          <p className="text-center text-sm text-ink-soft">
            Need a fresh link? <AuthLink to="/forgot-password">Request another</AuthLink>
          </p>
        )}
      </form>
    </AuthCard>
  );
};

export default ResetPasswordPage;
