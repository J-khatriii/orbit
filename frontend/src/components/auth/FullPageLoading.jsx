import { Spinner } from "../ui/index.js";
import OrbitLogo from "../layout/OrbitLogo.jsx";

const FullPageLoading = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-screen place-items-center bg-canvas text-ink-muted"
    >
      <div className="flex flex-col items-center gap-5">
        <OrbitLogo />
        <Spinner className="size-5" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
};

export default FullPageLoading;
