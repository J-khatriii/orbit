export const GAP = 1000;

// Positions are stored in a 32-bit column.
const LIMIT = 2_000_000_000;

const fits = (position) => {
  return Math.abs(position) <= LIMIT;
};

// `column` is the tasks already in the target column (without the one being moved), in
// order, as { id, position }. Works out where a task dropped right after `afterId` goes
// (null = the top). The answer is one of:
//   { position }   use this number
//   { crowded }    no room between the neighbours, respace the column and ask again
//   { missing }    `afterId` isn't in this column
export const positionAfter = (column, afterId) => {
  if (afterId === null || afterId === undefined) {
    const position = column.length === 0 ? GAP : column[0].position - GAP;

    return fits(position) ? { position } : { crowded: true };
  }

  const index = column.findIndex((task) => {
    return task.id === afterId;
  });

  if (index === -1) {
    return { missing: true };
  }

  const previous = column[index];
  const next = column[index + 1];

  if (!next) {
    const position = previous.position + GAP;

    return fits(position) ? { position } : { crowded: true };
  }

  const middle = Math.floor((previous.position + next.position) / 2);

  return middle > previous.position && middle < next.position
    ? { position: middle }
    : { crowded: true };
};
