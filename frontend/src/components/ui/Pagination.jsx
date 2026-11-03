import { Button } from "./index.js";

// "Showing 21–40 of 87" with Previous and Next buttons.
const Pagination = ({ page, totalPages, total, pageSize, onPageChange }) => {
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 pt-4">
      <p className="text-sm text-ink-soft">
        Showing {first}–{last} of {total}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1);
          }}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => {
            onPageChange(page + 1);
          }}
        >
          Next
        </Button>
      </div>
    </nav>
  );
};

export default Pagination;
