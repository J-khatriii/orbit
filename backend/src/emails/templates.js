const escapeHtml = (value) => {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
};

const layout = ({ heading, intro, buttonLabel, url, outro }) => {
  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f7f5f0;font-family:Arial,Helvetica,sans-serif;color:#1c1c1a;">
    <div style="max-width:480px;margin:0 auto;padding:40px 24px;">
      <p style="font-size:20px;font-weight:bold;margin:0 0 32px;">Orbit</p>
      <h1 style="font-size:24px;line-height:1.3;margin:0 0 16px;">${escapeHtml(heading)}</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">${escapeHtml(intro)}</p>
      <p style="margin:0 0 24px;">
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#2b4bd3;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:15px;font-weight:bold;">${escapeHtml(buttonLabel)}</a>
      </p>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;margin:0 0 8px;">Or paste this link into your browser:</p>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;word-break:break-all;margin:0 0 24px;">${escapeHtml(url)}</p>
      <p style="font-size:13px;line-height:1.6;color:#6b6b66;margin:0;">${escapeHtml(outro)}</p>
    </div>
  </body>
</html>`;

  const text = `${heading}\n\n${intro}\n\n${buttonLabel}: ${url}\n\n${outro}\n`;

  return { html, text };
};

export const verifyEmailEmail = ({ name, url }) => {
  return {
    subject: "Confirm your email for Orbit",
    ...layout({
      heading: "Confirm your email",
      intro: `Hi ${name}, welcome to Orbit. Please confirm your email address so we know it's really you.`,
      buttonLabel: "Confirm email",
      url,
      outro:
        "This link works for 24 hours. If you didn't create an Orbit account, you can ignore this email.",
    }),
  };
};

export const resetPasswordEmail = ({ name, url }) => {
  return {
    subject: "Reset your Orbit password",
    ...layout({
      heading: "Reset your password",
      intro: `Hi ${name}, we received a request to reset your Orbit password. Use the button below to choose a new one.`,
      buttonLabel: "Choose a new password",
      url,
      outro:
        "This link works for 1 hour. If you didn't ask for this, you can ignore this email and your password will stay the same.",
    }),
  };
};

const ROLE_LABELS = {
  admin: "an admin",
  member: "a team member",
  client: "a client",
};

export const invitationEmail = ({ inviterName, workspaceName, role, url }) => {
  return {
    subject: `${inviterName} invited you to ${workspaceName} on Orbit`,
    ...layout({
      heading: `Join ${workspaceName}`,
      intro: `${inviterName} invited you to join ${workspaceName} on Orbit as ${ROLE_LABELS[role]}.`,
      buttonLabel: "Accept invitation",
      url,
      outro:
        "This invitation works for 7 days. If you weren't expecting it, you can ignore this email.",
    }),
  };
};
