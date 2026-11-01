import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import AuthCard from "../components/auth/AuthCard.jsx";
import FormError from "../components/auth/FormError.jsx";
import { Button, Input, Select, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import { useAuthForm } from "../features/auth/useAuthForm.js";
import BrandColorPicker from "../features/onboarding/BrandColorPicker.jsx";
import { CURRENCIES } from "../features/onboarding/currencies.js";
import { detectTimezone, getTimezones } from "../features/onboarding/timezones.js";
import {
  validateWorkspaceBasics,
  validateWorkspaceDetails,
} from "../features/onboarding/validation.js";
import WorkspacePreview from "../features/onboarding/WorkspacePreview.jsx";
import { useUpdateWorkspace } from "../features/workspaces/useUpdateWorkspace.js";
import { fieldErrorsOf } from "../lib/api.js";
import { cn } from "../lib/cn.js";

const TOTAL_STEPS = 2;

const WelcomePage = () => {
  const { activeWorkspace } = useAuth();
  const toast = useToast();
  const update = useUpdateWorkspace();
  const [step, setStep] = useState(1);
  const timezones = useMemo(() => {
    return getTimezones();
  }, []);
  const form = useAuthForm({
    name: activeWorkspace?.name ?? "",
    brandColor: activeWorkspace?.brandColor ?? "#2b4bd3",
    defaultCurrency: activeWorkspace?.defaultCurrency ?? "USD",
    // The server's default is "UTC", which is rarely right, so we start from the browser's zone.
    timezone: detectTimezone(),
  });

  // Nothing to do here for non-owners, or once setup is done (this also fires right after
  // finishing, which is what carries you on to the dashboard).
  if (!activeWorkspace || activeWorkspace.role !== "owner" || activeWorkspace.onboarded) {
    return <Navigate to="/" replace />;
  }

  const goNext = (event) => {
    event.preventDefault();

    const problems = validateWorkspaceBasics(form.values);

    form.setErrors(problems);
    if (Object.keys(problems).length === 0) {
      setStep(2);
    }
  };

  const finish = (values, options) => {
    update.mutate(
      {
        workspaceId: activeWorkspace.id,
        changes: {
          name: values.name.trim(),
          brandColor: values.brandColor.toLowerCase(),
          defaultCurrency: values.defaultCurrency,
          timezone: values.timezone,
          onboarded: true,
        },
      },
      {
        onSuccess: () => {
          toast.show("Your workspace is ready.");
        },
        onError: (error) => {
          options.onError(error);

          // A problem with the name or colour lives on step 1, so take them back there.
          const fields = fieldErrorsOf(error);

          if (fields.name || fields.brandColor) {
            setStep(1);
          }
        },
      },
    );
  };

  const skip = () => {
    update.mutate(
      { workspaceId: activeWorkspace.id, changes: { onboarded: true } },
      {
        onError: (error) => {
          toast.show(error.message);
        },
      },
    );
  };

  const onSubmit = step === 1 ? goNext : form.handleSubmit(validateWorkspaceDetails, finish);

  return (
    <AuthCard
      title={step === 1 ? "Let's make it yours." : "A few work details."}
      subtitle={
        step === 1
          ? "Two quick steps and your workspace is ready. You can change any of this later."
          : "We use these for invoices and due dates."
      }
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2].map((number) => {
            return (
              <span
                key={number}
                className={cn(
                  "h-1.5 w-10 rounded-full",
                  number <= step ? "bg-brand-600" : "bg-sunken",
                )}
              />
            );
          })}
        </div>
        <span className="text-xs text-ink-muted">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>

      <form noValidate onSubmit={onSubmit} className="space-y-5">
        <FormError message={form.formError} />

        {step === 1 ? (
          <>
            <Input
              label="Workspace name"
              name="name"
              maxLength={60}
              value={form.values.name}
              onChange={form.handleChange("name")}
              error={form.errors.name}
            />
            <BrandColorPicker
              value={form.values.brandColor}
              onChange={(color) => {
                form.setValue("brandColor", color);
              }}
              error={form.errors.brandColor}
            />
            <WorkspacePreview name={form.values.name} color={form.values.brandColor} />
            <p className="text-sm text-ink-muted">
              Your colour is used on client-facing pages and invoices once those arrive.
            </p>
          </>
        ) : (
          <>
            <Select
              label="Currency"
              name="defaultCurrency"
              hint="New invoices start in this currency."
              value={form.values.defaultCurrency}
              onChange={form.handleChange("defaultCurrency")}
              error={form.errors.defaultCurrency}
            >
              {CURRENCIES.map((currency) => {
                return (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} · {currency.name}
                  </option>
                );
              })}
            </Select>
            <Select
              label="Timezone"
              name="timezone"
              hint="Due dates and reminders follow this."
              value={form.values.timezone}
              onChange={form.handleChange("timezone")}
              error={form.errors.timezone}
            >
              {timezones.map((zone) => {
                return (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                );
              })}
            </Select>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          {step === 1 ? (
            <Button variant="ghost" disabled={update.isPending} onClick={skip}>
              Skip for now
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={update.isPending}
              onClick={() => {
                setStep(1);
              }}
            >
              Back
            </Button>
          )}
          <Button type="submit" loading={update.isPending && step === 2}>
            {step === 1 ? "Next" : "Finish"}
          </Button>
        </div>

        {step === 2 && (
          <p className="text-center text-sm">
            <button
              type="button"
              disabled={update.isPending}
              onClick={skip}
              className="text-ink-muted hover:text-ink hover:underline disabled:opacity-50"
            >
              Skip for now
            </button>
          </p>
        )}
      </form>
    </AuthCard>
  );
};

export default WelcomePage;
