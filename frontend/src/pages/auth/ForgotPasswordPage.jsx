import AuthCard from "../../components/auth/AuthCard.jsx";
import AuthLink from "../../components/auth/AuthLink.jsx";
import FormError from "../../components/auth/FormError.jsx";
import { Button, Input } from "../../components/ui/index.js";
import { useForgotPassword } from "../../features/auth/useAuthActions.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { validateForgotPassword } from "../../features/auth/validation.js";

const ForgotPasswordPage = () => {
  const form = useAuthForm({ email: "" });
  const forgot = useForgotPassword();

  const backToSignIn = <AuthLink to="/login">Back to sign in</AuthLink>;

  // The same message appears whether or not an account exists for this email.
  if (forgot.isSuccess) {
    return (
      <AuthCard
        title="Check your inbox."
        subtitle={`If an account exists for ${form.values.email.trim()}, a link to reset your password is on its way. It works for one hour.`}
        footer={backToSignIn}
      >
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            forgot.reset();
          }}
        >
          Use a different email
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={backToSignIn}
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(validateForgotPassword, forgot.mutate)}
        className="space-y-5"
      >
        <FormError message={form.formError} />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          onChange={form.handleChange("email")}
          error={form.errors.email}
        />
        <Button type="submit" size="lg" loading={forgot.isPending} className="w-full">
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
