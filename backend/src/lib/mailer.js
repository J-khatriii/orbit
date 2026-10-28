import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export const sendEmail = async ({ to, subject, text, html }) => {
  const info = await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });

  logger.info({ messageId: info.messageId, subject }, "email sent");

  return info;
};
