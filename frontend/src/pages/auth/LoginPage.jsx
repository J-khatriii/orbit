import AuthCard from "../../components/auth/AuthCard.jsx";
import AuthLink from "../../components/auth/AuthLink.jsx";
import FormError from "../../components/auth/FormError.jsx";
import { Button, Input } from "../../components/ui/index.js";
import { useLogin } from "../../features/auth/useAuthActions.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { validateLogin } from "../../features/auth/validation.js";

const LoginPage = () => {
  const form = useAuthForm({ email: "", password: "" });
  const login = useLogin();

  // On success the signed-in state updates, and the route guard moves us along.
  return (
    <AuthCard
      title="Welcome back."
      subtitle="Sign in to pick up where you left off."
      footer={
        <>
          New to Orbit? <AuthLink to="/signup">Create an account</AuthLink>
        </>
      }
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(validateLogin, login.mutate)}
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
        <div>
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.values.password}
            onChange={form.handleChange("password")}
            error={form.errors.password}
          />
          <p className="mt-2 text-right text-sm">
            <AuthLink to="/forgot-password">Forgot password?</AuthLink>
          </p>
        </div>
        <Button type="submit" size="lg" loading={login.isPending} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthCard>
  );
};

export default LoginPage;
