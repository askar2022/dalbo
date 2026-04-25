export type SecurityAlertEvent = "sign_in" | "account_created";

type SendSecurityAlertEmailParams = {
  email: string;
  displayName?: string | null;
  audience?: "customer" | "driver" | "food_place" | "admin" | null;
  eventType: SecurityAlertEvent;
  ipAddress?: string | null;
  userAgent?: string | null;
  occurredAt?: Date;
};

type DeliveryResult = {
  delivered: boolean;
  reason?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getRoleLabel(audience?: SendSecurityAlertEmailParams["audience"]) {
  switch (audience) {
    case "food_place":
      return "Food Place";
    case "driver":
      return "Driver";
    case "admin":
      return "Admin";
    case "customer":
    default:
      return "Customer";
  }
}

function getOccurredAtLabel(occurredAt: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(occurredAt);
}

function getResetPasswordUrl(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (!appUrl) {
    return null;
  }

  const resetUrl = new URL("/login/reset-password", appUrl);
  resetUrl.searchParams.set("email", email);
  return resetUrl.toString();
}

function buildEmailShell(params: {
  eyebrow: string;
  title: string;
  intro: string;
  details: Array<{ label: string; value: string }>;
  body: string[];
  actionLabel?: string;
  actionHref?: string | null;
}) {
  const detailRows = params.details
    .map(
      (detail) => `
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-size: 13px; width: 120px;">${escapeHtml(detail.label)}</td>
          <td style="padding: 10px 0; color: #0f172a; font-size: 13px; font-weight: 600;">${escapeHtml(detail.value)}</td>
        </tr>
      `,
    )
    .join("");

  const bodyParagraphs = params.body
    .map(
      (paragraph) => `
        <p style="margin: 0 0 14px; color: #334155; font-size: 15px; line-height: 1.7;">
          ${escapeHtml(paragraph)}
        </p>
      `,
    )
    .join("");

  const actionButton =
    params.actionLabel && params.actionHref
      ? `
        <div style="margin-top: 24px;">
          <a href="${escapeHtml(params.actionHref)}" style="display: inline-block; padding: 14px 22px; border-radius: 999px; background: #ff6200; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none;">
            ${escapeHtml(params.actionLabel)}
          </a>
        </div>
      `
      : "";

  return `
    <div style="margin: 0; padding: 32px 16px; background: #fff7f1; font-family: Arial, sans-serif; color: #0f172a;">
      <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #fed7aa; border-radius: 24px; overflow: hidden;">
        <div style="padding: 24px 28px; background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%);">
          <div style="display: inline-block; padding: 8px 12px; border-radius: 999px; background: rgba(255, 98, 0, 0.16); color: #fdba74; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
            ${escapeHtml(params.eyebrow)}
          </div>
          <h1 style="margin: 18px 0 10px; color: #ffffff; font-size: 28px; line-height: 1.2;">
            ${escapeHtml(params.title)}
          </h1>
          <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.7;">
            ${escapeHtml(params.intro)}
          </p>
        </div>

        <div style="padding: 28px;">
          <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 20px; padding: 18px 20px; background: #f8fafc;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                ${detailRows}
              </tbody>
            </table>
          </div>

          ${bodyParagraphs}
          ${actionButton}

          <div style="margin-top: 24px; padding: 18px 20px; border-radius: 18px; background: #fff7ed; border: 1px solid #fdba74;">
            <p style="margin: 0; color: #9a3412; font-size: 14px; line-height: 1.7;">
              If this activity was not yours, change your password immediately and contact Dalbo support.
            </p>
          </div>
        </div>
      </div>

      <p style="max-width: 620px; margin: 16px auto 0; color: #64748b; font-size: 12px; line-height: 1.6; text-align: center;">
        Dalbo security alerts are sent to help protect your account.
      </p>
    </div>
  `;
}

function buildSecurityAlertCopy(params: SendSecurityAlertEmailParams) {
  const occurredAt = params.occurredAt ?? new Date();
  const roleLabel = getRoleLabel(params.audience);
  const recipientName = params.displayName?.trim() || "there";
  const eventTime = getOccurredAtLabel(occurredAt);
  const ipAddress = params.ipAddress ?? "Unavailable";
  const device = params.userAgent ?? "Unavailable";
  const resetPasswordUrl = getResetPasswordUrl(params.email);

  if (params.eventType === "account_created") {
    return {
      subject: "Your Dalbo account was created",
      text: [
        `Hi ${recipientName},`,
        "",
        `A new ${roleLabel.toLowerCase()} account was created for ${params.email}.`,
        `Time: ${eventTime}`,
        `IP address: ${ipAddress}`,
        `Device: ${device}`,
        "",
        "If you created this account, you can ignore this message.",
        "If this was not you, reset your password right away and contact Dalbo support.",
      ].join("\n"),
      html: buildEmailShell({
        eyebrow: "Account Created",
        title: "Your Dalbo account is ready",
        intro: `A new ${roleLabel.toLowerCase()} account was created for ${params.email}.`,
        details: [
          { label: "Account", value: params.email },
          { label: "Role", value: roleLabel },
          { label: "Time", value: eventTime },
          { label: "IP address", value: ipAddress },
          { label: "Device", value: device },
        ],
        body: [
          `Hi ${recipientName},`,
          "This email confirms that a new Dalbo account was just created.",
          "If you created this account, you do not need to do anything else right now.",
        ],
        actionLabel: "Reset password",
        actionHref: resetPasswordUrl,
      }),
    };
  }

  return {
    subject: "New Dalbo sign-in to your account",
    text: [
      `Hi ${recipientName},`,
      "",
      `We noticed a new sign-in to your Dalbo account for ${params.email}.`,
      `Time: ${eventTime}`,
      `IP address: ${ipAddress}`,
      `Device: ${device}`,
      "",
      "If this was you, no action is needed.",
      "If this was not you, reset your password right away and contact Dalbo support.",
    ].join("\n"),
    html: buildEmailShell({
      eyebrow: "Security Alert",
      title: "New sign-in to your Dalbo account",
      intro: `We noticed a fresh sign-in for ${params.email}.`,
      details: [
        { label: "Account", value: params.email },
        { label: "Time", value: eventTime },
        { label: "IP address", value: ipAddress },
        { label: "Device", value: device },
      ],
      body: [
        `Hi ${recipientName},`,
        "We are sending this message so you can quickly spot any unexpected access to your account.",
        "If this sign-in was yours, no action is needed.",
      ],
      actionLabel: "Reset password",
      actionHref: resetPasswordUrl,
    }),
  };
}

export async function sendSecurityAlertEmail(
  params: SendSecurityAlertEmailParams,
): Promise<DeliveryResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SECURITY_ALERT_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    return {
      delivered: false,
      reason: "missing_email_configuration",
    };
  }

  const emailCopy = buildSecurityAlertCopy(params);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [params.email],
      subject: emailCopy.subject,
      text: emailCopy.text,
      html: emailCopy.html,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Security alert email failed: ${errorBody}`);
  }

  return { delivered: true };
}
