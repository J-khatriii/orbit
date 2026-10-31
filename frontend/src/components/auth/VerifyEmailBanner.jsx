import { Mail } from "lucide-react";
import { Button, useToast } from "../ui/index.js";
import { useAuth } from "../../features/auth/authContext.js";
import { useResendVerification } from "../../features/auth/useAuthActions.js";

// A gentle reminder at the top of the app until the email is confirmed.
const VerifyEmailBanner = () => {
  const { user } = useAuth();
  const resend = useResendVerification();
  const toast = useToast();

  if (!user || user.emailVerified) {
    return null;
  }

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

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-100 bg-brand-50 px-6 py-2.5 text-sm text-brand-700 md:px-10"
    >
      <span className="flex items-center gap-2">
        <Mail className="size-4 shrink-0" aria-hidden="true" />
        Please confirm your email address. We sent a link to {user.email}.
      </span>
      <Button size="sm" variant="secondary" loading={resend.isPending} onClick={handleResend}>
        Resend email
      </Button>
    </div>
  );
};

export default VerifyEmailBanner;
