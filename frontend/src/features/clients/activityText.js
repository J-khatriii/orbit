import { STATUS_LABELS } from "./constants.js";

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
    default: {
      return action;
    }
  }
};
