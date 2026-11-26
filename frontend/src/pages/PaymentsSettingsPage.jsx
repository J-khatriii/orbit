import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { ExternalLink } from "lucide-react";
import { Badge, Button, Card, Modal, Spinner, useToast } from "../components/ui/index.js";
import { useAuth } from "../features/auth/authContext.js";
import {
  stripeStatusKey,
  useConnectStripe,
  useDisconnectStripe,
  useStripeStatus,
} from "../features/payments/usePayments.js";
import { useQueryClient } from "@tanstack/react-query";

const goToStripe = (data) => {
  window.location.assign(data.url);
};

const Row = ({ label, children }) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  );
};

const PaymentsSettingsPage = () => {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id;
  const isOwner = activeWorkspace?.role === "owner";
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState(() => {
    const result = searchParams.get("stripe");

    return result === "return" || result === "refresh" ? result : null;
  });
  const [confirming, setConfirming] = useState(false);
  const handledReturn = useRef(false);

  const status = useStripeStatus(workspaceId, isOwner);
  const { mutate: startConnect, isPending: connecting } = useConnectStripe(workspaceId);
  const disconnect = useDisconnectStripe(workspaceId);

  const connect = () => {
    startConnect(undefined, {
      onSuccess: goToStripe,
      onError: (error) => {
        if (error.code === "ALREADY_CONNECTED") {
          queryClient.invalidateQueries({ queryKey: stripeStatusKey(workspaceId) });
        }
        toast.show(error.message);
      },
    });
  };

  // Stripe sends the owner back here with ?stripe=return (they finished or saved for later)
  // or ?stripe=refresh (the one-time link expired, so a fresh one is requested right away).
  // The notice was already read from the address when the page opened, so this only tidies
  // the address and, for an expired link, asks for a new one.
  useEffect(() => {
    const result = searchParams.get("stripe");

    if (!result || handledReturn.current || !workspaceId || !isOwner) {
      return;
    }

    handledReturn.current = true;
    setSearchParams({}, { replace: true });

    if (result === "refresh") {
      startConnect(undefined, {
        onSuccess: goToStripe,
        onError: (error) => {
          setNotice(null);
          toast.show(error.message);
        },
      });
    }
  }, [searchParams, setSearchParams, startConnect, toast, workspaceId, isOwner]);

  const confirmDisconnect = () => {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        setConfirming(false);
        toast.show("Stripe disconnected");
      },
      onError: (error) => {
        setConfirming(false);
        toast.show(error.message);
      },
    });
  };

  if (activeWorkspace && !isOwner) {
    return <Navigate to="/" replace />;
  }
  if (status.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (status.isError) {
    return (
      <Card title="Payments">
        <p className="text-sm text-ink-soft">{status.error.message}</p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => {
            status.refetch();
          }}
        >
          Try again
        </Button>
      </Card>
    );
  }

  const data = status.data;
  const ready = data.connected && data.chargesEnabled;
  const unfinished = data.connected && !data.chargesEnabled;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      {notice === "refresh" && (
        <Card tone="brand">
          <p className="text-sm text-brand-700">
            That Stripe link expired. Taking you back to Stripe.
          </p>
        </Card>
      )}
      {notice === "return" && ready && (
        <Card tone="sage">
          <p className="text-sm text-sage-700">Stripe is connected. Clients can now pay online.</p>
        </Card>
      )}
      {notice === "return" && unfinished && (
        <Card tone="clay">
          <p className="text-sm text-clay-700">
            Stripe still needs a few details before it can take payments. Continue setup when you're
            ready.
          </p>
        </Card>
      )}

      <Card
        title="Online payments"
        actions={
          data.configured && (
            <Badge tone={ready ? "sage" : unfinished ? "clay" : "neutral"}>
              {ready ? "Ready" : unfinished ? "Setup unfinished" : "Not connected"}
            </Badge>
          )
        }
      >
        {!data.configured ? (
          <p className="text-sm text-ink-soft">
            Online payments aren't set up on this server yet. Until they are, record payments by
            hand on each invoice.
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              Connect your own Stripe account so clients can pay invoices by card from their portal.
              The money goes straight to your Stripe account, and Orbit marks the invoice paid
              automatically.
            </p>

            {data.connected && (
              <dl className="mt-4 divide-y divide-line border-y border-line">
                <Row label="Details submitted">{data.detailsSubmitted ? "Yes" : "Not yet"}</Row>
                <Row label="Can take payments">{data.chargesEnabled ? "Yes" : "Not yet"}</Row>
                {data.country && <Row label="Country">{data.country}</Row>}
                <Row label="Mode">
                  <Badge tone={data.livemode ? "brand" : "neutral"} dot={false}>
                    {data.livemode ? "Live" : "Test"}
                  </Badge>
                </Row>
              </dl>
            )}

            {data.statusCheckFailed && (
              <p className="mt-4 text-sm text-clay-700">
                We couldn't check with Stripe just now, so this may be out of date. Reload in a
                moment.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {!ready && (
                <Button icon={ExternalLink} loading={connecting} onClick={connect}>
                  {unfinished ? "Continue setup" : "Connect Stripe"}
                </Button>
              )}
              {data.connected && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setConfirming(true);
                  }}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </>
        )}
      </Card>

      <Modal
        open={confirming}
        onClose={() => {
          setConfirming(false);
        }}
        title="Disconnect Stripe?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setConfirming(false);
              }}
            >
              Keep connected
            </Button>
            <Button variant="danger" loading={disconnect.isPending} onClick={confirmDisconnect}>
              Disconnect
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-soft">
          Clients won't be able to pay online until you connect again. Your Stripe account and
          payments already received are not touched.
        </p>
      </Modal>
    </div>
  );
};

export default PaymentsSettingsPage;
