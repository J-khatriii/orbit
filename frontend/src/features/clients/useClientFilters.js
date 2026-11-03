import { useCallback } from "react";
import { useSearchParams } from "react-router";
import { PAGE_SIZE, SORT_OPTIONS, STATUS_LABELS, VIEW_LABELS } from "./constants.js";

const DEFAULTS = { search: "", status: "", tag: "", view: "active", sortKey: "name:asc", page: 1 };

// Our names for the filters, and what each one is called in the address.
const PARAM_NAMES = {
  search: "search",
  status: "status",
  tag: "tag",
  view: "view",
  sortKey: "sort",
  page: "page",
};

// Anything odd in the address (typed by hand, or from an old link) falls back to a default.
const readFilters = (searchParams) => {
  const status = searchParams.get("status") ?? "";
  const view = searchParams.get("view") ?? "";
  const sortKey = searchParams.get("sort") ?? "";
  const page = Number.parseInt(searchParams.get("page") ?? "", 10);

  return {
    search: (searchParams.get("search") ?? "").slice(0, 100),
    status: STATUS_LABELS[status] ? status : DEFAULTS.status,
    tag: (searchParams.get("tag") ?? "").slice(0, 30),
    view: VIEW_LABELS[view] ? view : DEFAULTS.view,
    sortKey: SORT_OPTIONS.some((option) => {
      return option.value === sortKey;
    })
      ? sortKey
      : DEFAULTS.sortKey,
    page: page >= 1 ? page : DEFAULTS.page,
  };
};

export const useClientFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);

  // Changing any filter sends you back to page 1, unless the change is the page itself.
  const setFilters = useCallback(
    (changes) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          const merged = { page: 1, ...changes };

          for (const [key, value] of Object.entries(merged)) {
            if (value === "" || value === DEFAULTS[key]) {
              next.delete(PARAM_NAMES[key]);
            } else {
              next.set(PARAM_NAMES[key], String(value));
            }
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clear = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const chosenSort = SORT_OPTIONS.find((option) => {
    return option.value === filters.sortKey;
  });

  return {
    filters,
    // What we actually send to the server.
    apiFilters: {
      search: filters.search,
      status: filters.status,
      tag: filters.tag,
      view: filters.view,
      sort: chosenSort.sort,
      order: chosenSort.order,
      page: filters.page,
      pageSize: PAGE_SIZE,
    },
    setFilters,
    clear,
    isFiltered: Boolean(
      filters.search || filters.status || filters.tag || filters.view !== "active",
    ),
  };
};
