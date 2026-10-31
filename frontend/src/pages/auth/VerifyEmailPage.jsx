import { useNavigate, useSearchParams } from "react-router";
import AuthCard from "../../components/auth/AuthCard.jsx";
import AuthLink from "../../components/auth/AuthLink.jsx";
import FormError from "../../components/auth/FormError.jsx";
import { Button, useToast } from "../../components/ui/index.js";
import { useAuth } from "../../features/auth/authContext.js";
import { useResendVerification, useVerifyEmail } from "../../features/auth/useAuthActions.js";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const verify = useVerifyEmail();
  const resend = useResendVerification();

  const signedIn = status === "signedIn";
  const canResend = signedIn && user && !user.emailVerified;

  const handleResend = () => {
    resend.mutate(undefined, {
      onSuccess: () => {
        toast.show("We sent you a new confirmation link.");
      },
      onError: (error) => {
        toast.show(error.message);
      },
    });
  };

  // What to offer when the link didn't work.
  const recovery = canResend ? (
    <Button
      variant="secondary"
      className="w-full"
      loading={resend.isPending}
      onClick={handleResend}
    >
      Send me a new link
    </Button>
  ) : (
    <p className="text-center text-sm text-ink-soft">
      {signedIn ? (
        <AuthLink to="/">Go to Orbit</AuthLink>
      ) : (
        <AuthLink to="/login">Sign in to get a new link</AuthLink>
      )}
    </p>
  );

  if (verify.isSuccess) {
    return (
      <AuthCard title="You're all set." subtitle="Your email is confirmed. Thanks for that.">
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            navigate(signedIn ? "/" : "/login");
          }}
        >
          {signedIn ? "Continue to Orbit" : "Sign in"}
        </Button>
      </AuthCard>
    );
  }

  if (!token) {
    return (
      <AuthCard title="This link isn't valid." subtitle="It may be incomplete or too old.">
        {recovery}
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Confirm your email."
      subtitle="One last step: confirm that this email address is yours."
    >
      <div className="space-y-5">
        <FormError message={verify.error?.message} />
        <Button
          size="lg"
          className="w-full"
          loading={verify.isPending}
          onClick={() => {
            verify.mutate(token);
          }}
        >
          Confirm my email
        </Button>
        {verify.isError && recovery}
      </div>
    </AuthCard>
  );
};

export default VerifyEmailPage;
