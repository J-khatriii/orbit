import AuthCard from "../../components/auth/AuthCard.jsx";
import AuthLink from "../../components/auth/AuthLink.jsx";
import FormError from "../../components/auth/FormError.jsx";
import { Button, Input, useToast } from "../../components/ui/index.js";
import { useSignup } from "../../features/auth/useAuthActions.js";
import { useAuthForm } from "../../features/auth/useAuthForm.js";
import { validateSignup } from "../../features/auth/validation.js";

const SignupPage = () => {
  const form = useAuthForm({ name: "", workspaceName: "", email: "", password: "" });
  const signup = useSignup();
  const toast = useToast();

  const submit = (values, options) => {
    signup.mutate(values, {
      ...options,
      onSuccess: () => {
        toast.show("Welcome to Orbit! We sent a link to confirm your email.");
      },
    });
  };

  return (
    <AuthCard
      title="A little space to do great work."
      subtitle="Create your account and your first workspace. It takes a minute."
      footer={
        <>
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>
        </>
      }
    >
      <form
        noValidate
        onSubmit={form.handleSubmit(validateSignup, submit, { EMAIL_TAKEN: "email" })}
        className="space-y-5"
      >
        <FormError message={form.formError} />
        <Input
          label="Your name"
          name="name"
          autoComplete="name"
          maxLength={100}
          value={form.values.name}
          onChange={form.handleChange("name")}
          error={form.errors.name}
        />
        <Input
          label="Workspace name"
          name="workspaceName"
          autoComplete="organization"
          maxLength={60}
          hint="Your agency or studio. You can change it later."
          value={form.values.workspaceName}
          onChange={form.handleChange("workspaceName")}
          error={form.errors.workspaceName}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.values.email}
          onChange={form.handleChange("email")}
          error={form.errors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters."
          value={form.values.password}
          onChange={form.handleChange("password")}
          error={form.errors.password}
        />
        <Button type="submit" size="lg" loading={signup.isPending} className="w-full">
          Create account
        </Button>
      </form>
    </AuthCard>
  );
};

export default SignupPage;
