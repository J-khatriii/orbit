import { db } from "../db/knex.js";
import * as clientsRepository from "../repositories/clients.repository.js";
import * as membershipsRepository from "../repositories/memberships.repository.js";
import * as projectMembersRepository from "../repositories/projectMembers.repository.js";
import * as projectsRepository from "../repositories/projects.repository.js";
import * as usersRepository from "../repositories/users.repository.js";
import { AppError } from "../utils/AppError.js";
import { isUuid } from "../utils/isUuid.js";
import { recordActivity } from "./activity.service.js";
import { toProject, toProjectMember } from "./serializers.js";

const COLUMN_NAMES = {
  clientId: "client_id",
  name: "name",
  description: "description",
  status: "status",
  startDate: "start_date",
  dueDate: "due_date",
  budgetMinor: "budget_minor",
  currency: "currency",
};

const FIELD_NAMES = Object.fromEntries(
  Object.entries(COLUMN_NAMES).map(([field, column]) => {
    return [column, field];
  }),
);

// Only people who work in the workspace can be put on a project, not portal clients.
const ASSIGNABLE_ROLES = ["owner", "admin", "member"];

const toColumns = (input) => {
  const columns = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      columns[COLUMN_NAMES[key]] = value;
    }
  }

  return columns;
};

const changedFields = (before, columns) => {
  return Object.entries(columns)
    .filter(([column, value]) => {
      return JSON.stringify(before[column]) !== JSON.stringify(value);
    })
    .map(([column]) => {
      return FIELD_NAMES[column];
    });
};

const projectNotFound = () => {
  return new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
};

// Dates are "YYYY-MM-DD", so comparing them as text compares them as dates.
const checkDates = (startDate, dueDate) => {
  if (startDate && dueDate && dueDate < startDate) {
    throw new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields", {
      fields: { dueDate: "The due date can't be before the start date" },
    });
  }
};

const logProjectEvent = async (
  executor,
  { workspaceId, actorId, project, action, metadata = {} },
) => {
  await recordActivity(executor, {
    workspaceId,
    actorId,
    entityType: "project",
    entityId: project.id,
    clientId: project.client_id,
    action,
    metadata: { name: project.name, clientName: project.client_name, ...metadata },
  });
};

export const loadProject = async (executor, workspaceId, projectId) => {
  const row = isUuid(projectId)
    ? await projectsRepository.findById(executor, { workspaceId, id: projectId })
    : undefined;

  if (!row) {
    throw projectNotFound();
  }

  return row;
};

export const listProjects = async (workspaceId, query) => {
  const { page, pageSize, ...rest } = query;
  const { rows, total } = await projectsRepository.list(db, {
    workspaceId,
    ...rest,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    projects: rows.map((row) => {
      return toProject(row);
    }),
    meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
};

export const getProject = async (workspaceId, projectId) => {
  const row = await loadProject(db, workspaceId, projectId);
  const members = await projectMembersRepository.listForProject(db, {
    workspaceId,
    projectId: row.id,
  });

  return {
    ...toProject(row),
    members: members.map((member) => {
      return toProjectMember(member);
    }),
  };
};

export const createProject = async ({ workspaceId, userId, input }) => {
  const client = isUuid(input.clientId)
    ? await clientsRepository.findById(db, { workspaceId, id: input.clientId })
    : undefined;

  if (!client) {
    throw new AppError(404, "CLIENT_NOT_FOUND", "Client not found");
  }
  if (client.archived_at) {
    throw new AppError(409, "CLIENT_ARCHIVED", "Restore this client before adding projects to it");
  }

  checkDates(input.startDate, input.dueDate);

  const row = await db.transaction(async (trx) => {
    const created = await projectsRepository.create(trx, {
      ...toColumns(input),
      workspace_id: workspaceId,
      created_by: userId,
    });
    const project = await projectsRepository.findById(trx, { workspaceId, id: created.id });

    await logProjectEvent(trx, {
      workspaceId,
      actorId: userId,
      project,
      action: "project.created",
    });

    return project;
  });

  return { ...toProject(row), members: [] };
};

export const updateProject = async ({ workspaceId, userId, projectId, input }) => {
  await db.transaction(async (trx) => {
    const before = await loadProject(trx, workspaceId, projectId);
    const columns = toColumns(input);

    // Check the dates as they'll be after this edit, mixing new values with saved ones.
    checkDates(
      columns.start_date === undefined ? before.start_date : columns.start_date,
      columns.due_date === undefined ? before.due_date : columns.due_date,
    );

    const fields = changedFields(before, columns);

    await projectsRepository.update(trx, { workspaceId, id: before.id, columns });

    // An edit that changes nothing isn't worth a line in the history.
    if (fields.length > 0) {
      const project = await projectsRepository.findById(trx, { workspaceId, id: before.id });
      const metadata = { fields };

      if (fields.includes("status")) {
        metadata.status = { from: before.status, to: project.status };
      }
      if (fields.includes("name")) {
        metadata.previousName = before.name;
      }

      await logProjectEvent(trx, {
        workspaceId,
        actorId: userId,
        project,
        action: "project.updated",
        metadata,
      });
    }
  });

  return getProject(workspaceId, projectId);
};

export const setProjectArchived = async ({ workspaceId, userId, projectId, archived }) => {
  await db.transaction(async (trx) => {
    const before = await loadProject(trx, workspaceId, projectId);

    // Already in the requested state: nothing to change, nothing to record.
    if (Boolean(before.archived_at) === archived) {
      return;
    }

    await projectsRepository.setArchived(trx, { workspaceId, id: before.id, archived });

    const project = await projectsRepository.findById(trx, { workspaceId, id: before.id });

    await logProjectEvent(trx, {
      workspaceId,
      actorId: userId,
      project,
      action: archived ? "project.archived" : "project.restored",
    });
  });

  return getProject(workspaceId, projectId);
};

export const addProjectMember = async ({ workspaceId, userId, projectId, input }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);
    const membership = isUuid(input.userId)
      ? await membershipsRepository.findForUser(trx, { workspaceId, userId: input.userId })
      : undefined;

    if (!membership || membership.status !== "active") {
      throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
    }
    if (!ASSIGNABLE_ROLES.includes(membership.role)) {
      throw new AppError(
        400,
        "INVALID_MEMBER",
        "Only people who work in this workspace can be put on a project",
      );
    }
    if (
      await projectMembersRepository.exists(trx, { projectId: project.id, userId: input.userId })
    ) {
      throw new AppError(409, "ALREADY_ASSIGNED", "This person is already on the project");
    }

    await projectMembersRepository.add(trx, {
      workspaceId,
      projectId: project.id,
      userId: input.userId,
      role: input.role ?? "member",
    });

    const person = await usersRepository.findById(trx, input.userId);

    await logProjectEvent(trx, {
      workspaceId,
      actorId: userId,
      project,
      action: "project.member_added",
      metadata: { memberName: person.name },
    });
  });

  return getProject(workspaceId, projectId);
};

export const removeProjectMember = async ({ workspaceId, userId, projectId, memberId }) => {
  await db.transaction(async (trx) => {
    const project = await loadProject(trx, workspaceId, projectId);
    const person = isUuid(memberId) ? await usersRepository.findById(trx, memberId) : undefined;
    const removed = person
      ? await projectMembersRepository.remove(trx, {
          workspaceId,
          projectId: project.id,
          userId: memberId,
        })
      : 0;

    if (!removed) {
      throw new AppError(404, "MEMBER_NOT_FOUND", "That person isn't on this project");
    }

    await logProjectEvent(trx, {
      workspaceId,
      actorId: userId,
      project,
      action: "project.member_removed",
      metadata: { memberName: person.name },
    });
  });

  return getProject(workspaceId, projectId);
};
