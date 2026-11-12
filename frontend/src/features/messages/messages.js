// The server sends each page newest first. Pages can overlap by a message when someone posts
// while you're paging, so repeats are dropped. The result reads oldest to newest.
export const chronological = (pages) => {
  const seen = new Set();
  const newestFirst = [];

  for (const page of pages) {
    for (const message of page.messages) {
      if (!seen.has(message.id)) {
        seen.add(message.id);
        newestFirst.push(message);
      }
    }
  }

  return newestFirst.reverse();
};

export const formatWhen = (value) => {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};
