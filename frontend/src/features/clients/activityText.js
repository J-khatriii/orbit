import { STATUS_LABELS } from "./constants.js";
import { PROJECT_STATUS_LABELS } from "../projects/constants.js";
import { TASK_STATUS_LABELS } from "../tasks/constants.js";

const FIELD_LABELS = {
  companyName: "company name",
  status: "status",
  billingEmail: "billing email",
  billingAddress: "billing address",
  taxId: "tax ID",
  currency: "currency",
  notesInternal: "internal notes",
  tags: "tags",
  name: "name",
  email: "email",
  phone: "phone number",
  jobTitle: "job title",
  isPrimary: "primary contact",
  description: "description",
  startDate: "start date",
  dueDate: "due date",
  budgetMinor: "budget",
  title: "title",
  priority: "priority",
  assigneeId: "assignee",
};

const listFields = (fields) => {
  return fields
    .map((field) => {
      return FIELD_LABELS[field] ?? field;
    })
    .join(", ");
};

// The part of the sentence after the person's name: "<Eli> added this client".
export const describeActivity = (event) => {
  const { action, metadata } = event;

  switch (action) {
    case "client.created": {
      return "added this client";
    }
    case "client.updated": {
      const others = (metadata.fields ?? []).filter((field) => {
        return field !== "status";
      });
      const parts = [];

      if (metadata.status) {
        const from = STATUS_LABELS[metadata.status.from];
        const to = STATUS_LABELS[metadata.status.to];

        parts.push(`changed the status from ${from} to ${to}`);
      }
      if (others.length > 0) {
        parts.push(`updated the ${listFields(others)}`);
      }

      return parts.join(" and ") || "updated this client";
    }
    case "client.archived": {
      return "archived this client";
    }
    case "client.restored": {
      return "restored this client";
    }
    case "contact.created": {
      return `added ${metadata.name} as a contact`;
    }
    case "contact.updated": {
      return `updated the ${listFields(metadata.fields ?? [])} of ${metadata.name}`;
    }
    case "contact.deleted": {
      return `removed the contact ${metadata.name}`;
    }
    case "client.access_granted": {
      return `gave ${metadata.userName ?? "someone"} access to the portal for ${metadata.name}`;
    }
    case "client.access_revoked": {
      return `removed ${metadata.userName ?? "someone"}'s access to the portal for ${metadata.name}`;
    }
    case "project.created": {
      const template = metadata.templateName;

      return template
        ? `created the project ${metadata.name} from the template ${template}`
        : `created the project ${metadata.name}`;
    }
    case "project.updated": {
      const others = (metadata.fields ?? []).filter((field) => {
        return field !== "status";
      });
      const parts = [];

      if (metadata.status) {
        const from = PROJECT_STATUS_LABELS[metadata.status.from];
        const to = PROJECT_STATUS_LABELS[metadata.status.to];

        parts.push(`moved ${metadata.name} from ${from} to ${to}`);
      }
      if (others.length > 0) {
        parts.push(`updated the ${listFields(others)} of ${metadata.name}`);
      }

      return parts.join(" and ") || `updated ${metadata.name}`;
    }
    case "project.archived": {
      return `archived the project ${metadata.name}`;
    }
    case "project.restored": {
      return `restored the project ${metadata.name}`;
    }
    case "project.member_added": {
      return `added ${metadata.memberName} to ${metadata.name}`;
    }
    case "project.member_removed": {
      return `removed ${metadata.memberName} from ${metadata.name}`;
    }
    case "task.created": {
      return `added the task ${metadata.title} to ${metadata.projectName}`;
    }
    case "task.updated": {
      const fields = metadata.fields ?? [];
      const others = fields.filter((field) => {
        return field !== "status" && field !== "assigneeId" && field !== "title";
      });
      const parts = [];

      if (metadata.status) {
        const { from, to } = metadata.status;

        parts.push(
          to === "done"
            ? `completed ${metadata.title}`
            : `moved ${metadata.title} from ${TASK_STATUS_LABELS[from]} to ${TASK_STATUS_LABELS[to]}`,
        );
      }
      if (fields.includes("assigneeId")) {
        parts.push(
          metadata.assigneeName
            ? `assigned ${metadata.title} to ${metadata.assigneeName}`
            : `unassigned ${metadata.title}`,
        );
      }
      if (fields.includes("title") && metadata.previousTitle) {
        parts.push(`renamed ${metadata.previousTitle} to ${metadata.title}`);
      }
      if (others.length > 0) {
        parts.push(`updated the ${listFields(others)} of ${metadata.title}`);
      }

      return parts.join(" and ") || `updated ${metadata.title}`;
    }
    case "task.deleted": {
      return `deleted the task ${metadata.title}`;
    }
    default: {
      return action;
    }
  }
};
