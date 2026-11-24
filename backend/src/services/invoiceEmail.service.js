import { env } from "../config/env.js";
import { db } from "../db/knex.js";
import { invoiceEmail } from "../emails/templates.js";
import { logger } from "../lib/logger.js";
import { sendEmail } from "../lib/mailer.js";
import { formatMinor } from "../lib/money.js";
import * as invoicesRepository from "../repositories/invoices.repository.js";
import * as notificationsRepository from "../repositories/notifications.repository.js";
import { toInvoice } from "./serializers.js";

// Emails an invoice to everyone with portal access to its client. A problem with one address
// doesn't stop the others. The sent time is recorded only if at least one email went out.
// Returns how many people should get it and how many were sent.
export const deliverInvoice = async ({ workspaceId, invoiceId, resend }) => {
  const row = await invoicesRepository.findById(db, { workspaceId, id: invoiceId });
  const userIds = await notificationsRepository.listClientUserIds(db, {
    workspaceId,
    clientId: row.client_id,
  });
  const users = userIds.length > 0 ? await notificationsRepository.listUsers(db, userIds) : [];
  const workspace = await invoicesRepository.findWorkspace(db, { workspaceId });
  const label = toInvoice(row).label;
  let sent = 0;

  for (const user of users) {
    try {
      await sendEmail({
        to: user.email,
        ...invoiceEmail({
          name: user.name,
          workspaceName: workspace.name,
          label,
          amount: formatMinor(row.total_minor - row.amount_paid_minor, row.currency),
          dueDate: row.due_date,
          url: `${env.APP_URL}/portal/invoices/${row.id}`,
          resend,
        }),
      });
      sent += 1;
    } catch (error) {
      logger.error({ err: error, invoiceId }, "invoice email failed");
    }
  }

  if (sent > 0) {
    await invoicesRepository.recordEmailed(db, { workspaceId, id: row.id });
  }

  return { recipients: users.length, sent };
};
