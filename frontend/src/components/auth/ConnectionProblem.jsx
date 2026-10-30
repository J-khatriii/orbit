import { Button } from "../ui/index.js";
import OrbitLogo from "../layout/OrbitLogo.jsx";

const ConnectionProblem = ({ onRetry }) => {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas px-6 text-ink">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <OrbitLogo />
        <h1 className="font-display text-3xl">We can&apos;t reach Orbit right now.</h1>
        <p className="text-sm text-ink-soft">
          Check your connection and try again. Your work is safe.
        </p>
        <Button onClick={onRetry}>Try again</Button>
      </div>
    </div>
  );
};

export default ConnectionProblem;
