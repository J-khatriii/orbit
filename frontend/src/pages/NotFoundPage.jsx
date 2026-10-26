import { Link } from "react-router";

const NotFoundPage = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">That page doesn't exist.</p>
      <Link
        to="/"
        className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
