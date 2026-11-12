import { db } from "../db/knex.js";
import * as projectMembersRepository from "../repositories/projectMembers.repository.js";
import * as tasksRepository from "../repositories/tasks.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { GAP, positionAfter } from "../utils/ordering.js";
import { recordActivity } from "./activity.service.js";
import { loadProject } from "./project.service.js";
import { toMyTask, toTask } from "./serializers.js";

const COLUMN_NAMES = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  assigneeId: "assignee_id",
  dueDate: "due_date",
  clientVisible: "client_visible",
};

const FIELD_NAMES = Object.fromEntries(
  Object.entries(COLUMN_NAMES).map(([field, column]) => {
    return [column, field];
  }),
);

const toColumns = (input) => {
  const columns = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      columns[COLUMN_NAMES[key]] = value;
    }
  }

  return columns;
};

// Which fields would this edit really change? Returns their API names.
const changedFields = (before, columns) => {
  return Object.entries(columns)
    .filter(([column, value]) => {
      return JSON.stringify(before[column]) !== JSON.stringify(value);
    })
    .map(([column]) => {
      return FIELD_NAMES[column];
    });
};

const fieldError = (field, message) => {
  return new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", {
    fields: { [field]: message },
  });
};

export const loadTask = async (executor, workspaceId, projectId, taskId) => {
  const row = isUuid(taskId)
    ? await tasksRepository.findById(executor, { workspaceId, projectId, id: taskId })
    : undefined;

  if (!row) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  return row;
};

// Tasks can be read in an archived project, but not changed.
export const ensureEditable = (project) => {
  if (project.archived_at) {
    throw new AppError(409, "PROJECT_ARCHIVED", "Restore this project before changing its tasks");
  }
};

// The assignee must be on the project's team. (The database insists too. This gives a
// clear message first.)
const ensureOnTeam = async (executor, projectId, assigneeId) => {
  if (!assigneeId) {
    return;
  }

  const onTeam = await projectMembersRepository.exists(executor, {
    projectId,
    userId: assigneeId,
  });

  if (!onTeam) {
    throw fieldError("assigneeId", "Choose someone from this project's team");
  }
};

// A task is done exactly when it has a completion time. This says what to write when a
// task moves in or out of Done, and nothing when it doesn't.
const completionColumns = (executor, wasDone, isDone) => {
  if (wasDone === isDone) {
    return {};
  }

  return { completed_at: isDone ? executor.fn.now() : null };
};

const bottomOf = async (executor, projectId, status) => {
  const last = await tasksRepository.maxPosition(executor, { projectId, status });

  return (last ?? 0) + GAP;
};

// `task` is a row from the repository, so it has the title as it is now.
const logTaskEvent = async (
  executor,
  { workspaceId, actorId, project, task, action, metadata = {} },
) => {
  await recordActivity(executor, {
    workspaceId,
    actorId,
    entityType: "task",
    entityId: task.id,
    clientId: project.client_id,
    projectId: project.id,
    action,
    metadata: { title: task.title, projectName: project.name, ...metadata },
  });
};

export const listTasks = async (workspaceId, projectId, query) => {
  const project = await loadProject(db, workspaceId, projectId);
  const rows = await tasksRepository.list(db, { workspaceId, projectId: project.id, ...query });

  return {
    tasks: rows.map((row) => {
      return toTask(row);
    }),
  };
};

export const getTask = async (workspaceId, projectId, taskId) => {
  const project = await loadProject(db, workspaceId, projectId);
  const row = await loadTask(db, workspaceId, project.id, taskId);

  return toTask(row);
};

export const createTask = async ({ workspaceId, userId, projectId, input }) => {
  const taskId = await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);

    ensureEditable(project);
    await ensureOnTeam(trx, project.id, input.assigneeId);

    const status = input.status ?? "todo";
    const created = await tasksRepository.create(trx, {
      ...toColumns(input),
      status,
      position: await bottomOf(trx, project.id, status),
      ...completionColumns(trx, false, status === "done"),
      workspace_id: workspaceId,
      project_id: project.id,
      created_by: userId,
    });
    const task = await tasksRepository.findById(trx, {
      workspaceId,
      projectId: project.id,
      id: created.id,
    });

    await logTaskEvent(trx, {
      workspaceId,
      actorId: userId,
      project,
      task,
      action: "task.created",
    });

    return created.id;
  });

  return getTask(workspaceId, projectId, taskId);
};

export const updateTask = async ({ workspaceId, userId, projectId, taskId, input }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);

    ensureEditable(project);

    const before = await loadTask(trx, workspaceId, project.id, taskId);
    const columns = toColumns(input);

    await ensureOnTeam(trx, project.id, columns.assignee_id);

    // Worked out before the bookkeeping columns (position, completion) are added.
    const fields = changedFields(before, columns);

    // A new status through an edit lands at the bottom of that column.
    if (columns.status !== undefined && columns.status !== before.status) {
      columns.position = await bottomOf(trx, project.id, columns.status);
      Object.assign(
        columns,
        completionColumns(trx, before.status === "done", columns.status === "done"),
      );
    }

    await tasksRepository.update(trx, { workspaceId, id: before.id, columns });

    // An edit that changes nothing isn't worth a line in the history.
    if (fields.length > 0) {
      const task = await tasksRepository.findById(trx, {
        workspaceId,
        projectId: project.id,
        id: before.id,
      });
      const metadata = { fields };

      if (fields.includes("status")) {
        metadata.status = { from: before.status, to: task.status };
      }
      if (fields.includes("title")) {
        metadata.previousTitle = before.title;
      }
      if (fields.includes("assigneeId")) {
        metadata.assigneeName = task.assignee_name ?? null;
      }

      await logTaskEvent(trx, {
        workspaceId,
        actorId: userId,
        project,
        task,
        action: "task.updated",
        metadata,
      });
    }
  });

  return getTask(workspaceId, projectId, taskId);
};

// Puts a task in a column, inside a transaction the caller already opened. `before` is the
// task as it was. Only a change of column is written to the history.
export const placeTask = async (
  trx,
  { workspaceId, userId, project, before, status, afterTaskId },
) => {
  const where = { projectId: project.id, status, excludeId: before.id };
  const afterId = afterTaskId ?? null;
  let placed = positionAfter(await tasksRepository.listColumn(trx, where), afterId);

  if (placed.crowded) {
    // No room between the two neighbours: respace the column, then ask again.
    await tasksRepository.renumberColumn(trx, { projectId: project.id, status });
    placed = positionAfter(await tasksRepository.listColumn(trx, where), afterId);
  }
  if (placed.missing) {
    throw fieldError("afterTaskId", "That task isn't in this column");
  }

  await tasksRepository.update(trx, {
    workspaceId,
    id: before.id,
    columns: {
      status,
      position: placed.position,
      ...completionColumns(trx, before.status === "done", status === "done"),
    },
  });

  // Only a change of column is worth recording. Reordering within one isn't.
  if (before.status !== status) {
    const task = await tasksRepository.findById(trx, {
      workspaceId,
      projectId: project.id,
      id: before.id,
    });

    await logTaskEvent(trx, {
      workspaceId,
      actorId: userId,
      project,
      task,
      action: "task.updated",
      metadata: { fields: ["status"], status: { from: before.status, to: task.status } },
    });
  }
};

export const moveTask = async ({ workspaceId, userId, projectId, taskId, input }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);

    ensureEditable(project);

    const before = await loadTask(trx, workspaceId, project.id, taskId);

    await placeTask(trx, {
      workspaceId,
      userId,
      project,
      before,
      status: input.status,
      afterTaskId: input.afterTaskId,
    });
  });

  return getTask(workspaceId, projectId, taskId);
};

export const deleteTask = async ({ workspaceId, userId, projectId, taskId }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);

    ensureEditable(project);

    const task = await loadTask(trx, workspaceId, project.id, taskId);

    await tasksRepository.remove(trx, { workspaceId, id: task.id });
    await logTaskEvent(trx, {
      workspaceId,
      actorId: userId,
      project,
      task,
      action: "task.deleted",
    });
  });
};

export const listMyTasks = async (workspaceId, userId, query) => {
  const { view, page, pageSize } = query;
  const { rows, total } = await tasksRepository.listAssignedTo(db, {
    workspaceId,
    userId,
    view,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    tasks: rows.map((row) => {
      return toMyTask(row);
    }),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
};
