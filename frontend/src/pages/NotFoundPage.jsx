import { Link } from "react-router";
import { PageHeader } from "../components/ui/index.js";

const NotFoundPage = () => {
  return (
    <PageHeader
      eyebrow="Error 404"
      title="That page wandered off."
      subtitle="It may have moved, or the link might be a little off."
      actions={
        <Link
          to="/"
          className="inline-flex h-10 items-center rounded-control bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Back to overview
        </Link>
      }
    />
  );
};

export default NotFoundPage;
