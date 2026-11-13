// Database rows use snake_case. The API speaks camelCase and never exposes password hashes.

export const toUser = (row) => {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    emailVerified: Boolean(row.email_verified_at),
    createdAt: row.created_at,
  };
};

export const toWorkspace = (row, role) => {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    brandColor: row.brand_color,
    defaultCurrency: row.default_currency,
    timezone: row.timezone,
    onboarded: Boolean(row.onboarded_at),
    role,
  };
};

export const toMember = (row) => {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  };
};

export const toInvitation = (row) => {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    invitedByName: row.invited_by_name ?? null,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
};

export const toClient = (row) => {
  return {
    id: row.id,
    companyName: row.company_name,
    status: row.status,
    billingEmail: row.billing_email,
    billingAddress: row.billing_address,
    taxId: row.tax_id,
    currency: row.currency,
    notesInternal: row.notes_internal,
    tags: row.tags,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const toActivity = (row) => {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    clientId: row.client_id,
    projectId: row.project_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    actor: row.actor_id ? { id: row.actor_id, name: row.actor_name } : null,
  };
};

export const toContact = (row) => {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const toProject = (row) => {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: row.start_date,
    dueDate: row.due_date,
    budgetMinor: row.budget_minor,
    currency: row.currency,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    memberCount: row.member_count,
    taskCount: row.task_count,
    tasksDone: row.tasks_done,
  };
};

export const toProjectMember = (row) => {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    addedAt: row.created_at,
  };
};

export const toTask = (row) => {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeId: row.assignee_id,
    assignee: row.assignee_id
      ? { id: row.assignee_id, name: row.assignee_name, avatarUrl: row.assignee_avatar_url }
      : null,
    dueDate: row.due_date,
    position: row.position,
    clientVisible: row.client_visible,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// A task plus where it lives, for lists that span projects.
export const toMyTask = (row) => {
  return {
    ...toTask(row),
    projectName: row.project_name,
    clientId: row.client_id,
    clientName: row.client_name,
  };
};

export const toTemplate = (row) => {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    taskCount: row.task_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const toTemplateTask = (row) => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueOffsetDays: row.due_offset_days,
    position: row.position,
  };
};

export const toClientAccess = (row) => {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
    grantedAt: row.granted_at,
  };
};

export const toClientCandidate = (row) => {
  return {
    userId: row.user_id,
    name: row.name,
    email: row.email,
  };
};

export const toMessage = (row) => {
  return {
    id: row.id,
    body: row.body,
    internal: row.internal,
    projectId: row.project_id,
    projectName: row.project_name,
    author: row.author_id ? { id: row.author_id, name: row.author_name } : null,
    createdAt: row.created_at,
  };
};

export const toPortalProject = (row) => {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    clientId: row.client_id,
    clientName: row.client_name,
    startDate: row.start_date,
    dueDate: row.due_date,
    taskCount: row.task_count,
    tasksDone: row.tasks_done,
  };
};

export const toPortalTask = (row) => {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    dueDate: row.due_date,
    completedAt: row.completed_at,
  };
};

export const toPortalClient = (row) => {
  return {
    id: row.id,
    name: row.company_name,
  };
};

// What a client sees of a message: no ids of other people, no internal flag.
export const toPortalMessage = (row, userId) => {
  return {
    id: row.id,
    body: row.body,
    projectName: row.project_name,
    authorName: row.author_name,
    mine: row.author_id === userId,
    createdAt: row.created_at,
  };
};

export const toReview = (row) => {
  return {
    id: row.id,
    decision: row.decision,
    comment: row.comment,
    reviewerName: row.reviewer_name,
    createdAt: row.created_at,
  };
};

export const toNotification = (row) => {
  return {
    id: row.id,
    kind: row.kind,
    clientId: row.client_id,
    projectId: row.project_id,
    taskId: row.task_id,
    data: row.data,
    read: row.read_at !== null,
    createdAt: row.created_at,
  };
};
