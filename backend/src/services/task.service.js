import { db } from "../db/knex.js";
import * as projectMembersRepository from "../repositories/projectMembers.repository.js";
import * as tasksRepository from "../repositories/tasks.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { GAP, positionAfter } from "../utils/ordering.js";
import { loadProject } from "./project.service.js";
import { toTask } from "./serializers.js";

const COLUMN_NAMES = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  assigneeId: "assignee_id",
  dueDate: "due_date",
  clientVisible: "client_visible",
};

const toColumns = (input) => {
  const columns = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      columns[COLUMN_NAMES[key]] = value;
    }
  }

  return columns;
};

const fieldError = (field, message) => {
  return new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", {
    fields: { [field]: message },
  });
};

const loadTask = async (executor, workspaceId, projectId, taskId) => {
  const row = isUuid(taskId)
    ? await tasksRepository.findById(executor, { workspaceId, projectId, id: taskId })
    : undefined;

  if (!row) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  return row;
};

// Tasks can be read in an archived project, but not changed.
const ensureEditable = (project) => {
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

    return created.id;
  });

  return getTask(workspaceId, projectId, taskId);
};

export const updateTask = async ({ workspaceId, projectId, taskId, input }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);

    ensureEditable(project);

    const before = await loadTask(trx, workspaceId, project.id, taskId);
    const columns = toColumns(input);

    await ensureOnTeam(trx, project.id, columns.assignee_id);

    // A new status through an edit lands at the bottom of that column.
    if (columns.status !== undefined && columns.status !== before.status) {
      columns.position = await bottomOf(trx, project.id, columns.status);
      Object.assign(
        columns,
        completionColumns(trx, before.status === "done", columns.status === "done"),
      );
    }

    await tasksRepository.update(trx, { workspaceId, id: before.id, columns });
  });

  return getTask(workspaceId, projectId, taskId);
};

export const moveTask = async ({ workspaceId, projectId, taskId, input }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);

    ensureEditable(project);

    const before = await loadTask(trx, workspaceId, project.id, taskId);
    const where = { projectId: project.id, status: input.status, excludeId: before.id };
    const afterId = input.afterTaskId ?? null;
    let placed = positionAfter(await tasksRepository.listColumn(trx, where), afterId);

    if (placed.crowded) {
      // No room between the two neighbours: respace the column, then ask again.
      await tasksRepository.renumberColumn(trx, {
        projectId: project.id,
        status: input.status,
      });
      placed = positionAfter(await tasksRepository.listColumn(trx, where), afterId);
    }
    if (placed.missing) {
      throw fieldError("afterTaskId", "That task isn't in this column");
    }

    await tasksRepository.update(trx, {
      workspaceId,
      id: before.id,
      columns: {
        status: input.status,
        position: placed.position,
        ...completionColumns(trx, before.status === "done", input.status === "done"),
      },
    });
  });

  return getTask(workspaceId, projectId, taskId);
};

export const deleteTask = async ({ workspaceId, projectId, taskId }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);

    ensureEditable(project);

    const task = await loadTask(trx, workspaceId, project.id, taskId);

    await tasksRepository.remove(trx, { workspaceId, id: task.id });
  });
};
