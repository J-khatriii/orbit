import { db } from "../db/knex.js";
import * as projectsRepository from "../repositories/projects.repository.js";
import * as tasksRepository from "../repositories/tasks.repository.js";
import * as templatesRepository from "../repositories/templates.repository.js";
import { AppError } from "../utils/AppError.js";
import { addDays, daysBetween, todayUtc } from "../utils/days.js";
import { isUuid } from "../utils/isUuid.js";
import { GAP } from "../utils/ordering.js";
import { toTemplate, toTemplateTask } from "./serializers.js";

const MAX_TASKS = 100;

const nameTaken = () => {
  return new AppError(409, "TEMPLATE_EXISTS", "You already have a template with this name");
};

// The database refuses two templates with the same name. We turn that into a clear error.
const isNameClash = (error) => {
  return error.code === "23505" && error.constraint === "project_templates_unique_name";
};

export const loadTemplate = async (executor, workspaceId, templateId) => {
  const row = isUuid(templateId)
    ? await templatesRepository.findById(executor, { workspaceId, id: templateId })
    : undefined;

  if (!row) {
    throw new AppError(404, "TEMPLATE_NOT_FOUND", "Template not found");
  }

  return row;
};

export const listTemplates = async (workspaceId) => {
  const rows = await templatesRepository.list(db, workspaceId);

  return {
    templates: rows.map((row) => {
      return toTemplate(row);
    }),
  };
};

export const getTemplate = async (workspaceId, templateId) => {
  const row = await loadTemplate(db, workspaceId, templateId);
  const tasks = await templatesRepository.listTasks(db, { workspaceId, templateId: row.id });

  return {
    ...toTemplate(row),
    tasks: tasks.map((task) => {
      return toTemplateTask(task);
    }),
  };
};

export const createTemplate = async ({ workspaceId, userId, input }) => {
  try {
    const templateId = await db.transaction(async (trx) => {
      const created = await templatesRepository.create(trx, {
        workspace_id: workspaceId,
        name: input.name,
        description: input.description ?? null,
        created_by: userId,
      });

      await templatesRepository.insertTasks(trx, {
        workspaceId,
        templateId: created.id,
        tasks: input.tasks ?? [],
      });

      return created.id;
    });

    return await getTemplate(workspaceId, templateId);
  } catch (error) {
    throw isNameClash(error) ? nameTaken() : error;
  }
};

export const updateTemplate = async ({ workspaceId, templateId, input }) => {
  try {
    await db.transaction(async (trx) => {
      const before = await loadTemplate(trx, workspaceId, templateId);
      const columns = {};

      if (input.name !== undefined) {
        columns.name = input.name;
      }
      if (input.description !== undefined) {
        columns.description = input.description;
      }

      await templatesRepository.update(trx, { workspaceId, id: before.id, columns });

      if (input.tasks !== undefined) {
        await templatesRepository.replaceTasks(trx, {
          workspaceId,
          templateId: before.id,
          tasks: input.tasks,
        });
      }
    });
  } catch (error) {
    throw isNameClash(error) ? nameTaken() : error;
  }

  return getTemplate(workspaceId, templateId);
};

export const deleteTemplate = async ({ workspaceId, templateId }) => {
  const row = await loadTemplate(db, workspaceId, templateId);

  await templatesRepository.remove(db, { workspaceId, id: row.id });
};

// A due date becomes "N days after the project starts". Without a start date, or when the
// due date is before it, there's nothing sensible to keep.
const offsetFor = (startDate, dueDate) => {
  if (!startDate || !dueDate) {
    return null;
  }

  const offset = daysBetween(startDate, dueDate);

  return offset >= 0 && offset <= 3650 ? offset : null;
};

export const saveProjectAsTemplate = async ({ workspaceId, userId, projectId, input }) => {
  const project = isUuid(projectId)
    ? await projectsRepository.findById(db, { workspaceId, id: projectId })
    : undefined;

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  // In board order: by column, then position within it.
  const tasks = await tasksRepository.list(db, { workspaceId, projectId: project.id });

  if (tasks.length > MAX_TASKS) {
    throw new AppError(
      400,
      "TOO_MANY_TASKS",
      `A template can have at most ${MAX_TASKS} tasks. Delete some tasks first.`,
    );
  }

  return createTemplate({
    workspaceId,
    userId,
    input: {
      name: input.name,
      description: input.description,
      tasks: tasks.map((task) => {
        return {
          title: task.title,
          description: task.description,
          priority: task.priority,
          dueOffsetDays: offsetFor(project.start_date, task.due_date),
        };
      }),
    },
  });
};

// Copies a template's tasks into a project (as To do, unassigned). Run it inside the same
// transaction that creates the project. Returns how many tasks it added.
export const addTemplateTasks = async (
  executor,
  { workspaceId, userId, projectId, startDate, template },
) => {
  const templateTasks = await templatesRepository.listTasks(executor, {
    workspaceId,
    templateId: template.id,
  });
  const base = startDate ?? todayUtc();

  await tasksRepository.createMany(
    executor,
    templateTasks.map((task, index) => {
      return {
        workspace_id: workspaceId,
        project_id: projectId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        due_date: task.due_offset_days === null ? null : addDays(base, task.due_offset_days),
        position: (index + 1) * GAP,
        created_by: userId,
      };
    }),
  );

  return templateTasks.length;
};
