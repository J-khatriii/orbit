import pg from "pg";

// A DATE column stays as plain "YYYY-MM-DD" text. Otherwise the driver would turn it into a
// date at local midnight, and the day can shift when it's sent to the browser.
pg.types.setTypeParser(1082, (value) => {
  return value;
});

// bigint (int8) arrives as text by default. Our budgets and counts are far below 2^53.
pg.types.setTypeParser(20, (value) => {
  return Number(value);
});
