const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const getStudentName = (student) => {
  const fullName = [
    student?.firstName,
    student?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Student";
};

const createEmailLayout = ({
  previewText,
  heading,
  bodyHtml,
  actionUrl = "",
  actionText = "",
}) => {
  const frontendUrl = String(
    process.env.CLIENT_URL || ""
  ).replace(/\/$/, "");

  const completeActionUrl =
    actionUrl && frontendUrl
      ? `${frontendUrl}${actionUrl}`
      : "";

  const actionButton =
    completeActionUrl && actionText
      ? `
        <p style="margin: 28px 0;">
          <a
            href="${escapeHtml(
              completeActionUrl
            )}"
            style="
              background: #111827;
              color: #ffffff;
              padding: 12px 20px;
              border-radius: 8px;
              text-decoration: none;
              display: inline-block;
              font-weight: 600;
            "
          >
            ${escapeHtml(actionText)}
          </a>
        </p>
      `
      : "";

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <title>${escapeHtml(
          previewText
        )}</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background: #f3f4f6;
          font-family: Arial, sans-serif;
          color: #111827;
        "
      >
        <div
          style="
            display: none;
            max-height: 0;
            overflow: hidden;
          "
        >
          ${escapeHtml(previewText)}
        </div>

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          style="background: #f3f4f6;"
        >
          <tr>
            <td
              align="center"
              style="padding: 32px 16px;"
            >
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                style="
                  max-width: 600px;
                  background: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                "
              >
                <tr>
                  <td
                    style="
                      padding: 24px 28px;
                      background: #111827;
                      color: #ffffff;
                    "
                  >
                    <div
                      style="
                        font-size: 22px;
                        font-weight: 700;
                      "
                    >
                      EconLLS
                    </div>

                    <div
                      style="
                        margin-top: 4px;
                        font-size: 13px;
                        opacity: 0.8;
                      "
                    >
                      Economics Learning Portal
                    </div>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 30px 28px;
                      font-size: 16px;
                      line-height: 1.65;
                    "
                  >
                    <h1
                      style="
                        margin: 0 0 20px;
                        font-size: 24px;
                        line-height: 1.3;
                      "
                    >
                      ${escapeHtml(heading)}
                    </h1>

                    ${bodyHtml}

                    ${actionButton}

                    <p
                      style="
                        margin-top: 30px;
                        color: #6b7280;
                        font-size: 13px;
                      "
                    >
                      This is an automated message
                      from EconLLS.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export const createPaymentApprovedEmail = ({
  student,
  courseTitle,
  periodLabel,
  actionUrl,
}) => {
  const studentName =
    getStudentName(student);

  const accessDescription =
    periodLabel
      ? `Your payment for ${periodLabel} has been approved.`
      : "Your course payment has been approved.";

  const subject =
    "EconLLS payment approved";

  const text = [
    `Hello ${studentName},`,
    "",
    accessDescription,
    `Course: ${courseTitle}`,
    "",
    "You can now access the approved course content.",
  ].join("\n");

  const html = createEmailLayout({
    previewText:
      "Your EconLLS payment has been approved.",

    heading: "Payment approved",

    bodyHtml: `
      <p>
        Hello ${escapeHtml(studentName)},
      </p>

      <p>
        ${escapeHtml(accessDescription)}
      </p>

      <p>
        <strong>Course:</strong>
        ${escapeHtml(courseTitle)}
      </p>

      <p>
        You can now access the approved
        lessons and live classes.
      </p>
    `,

    actionUrl,
    actionText: "View payment and access",
  });

  return {
    subject,
    text,
    html,
  };
};

export const createPaymentRejectedEmail = ({
  student,
  courseTitle,
  periodLabel,
  reason,
  actionUrl,
}) => {
  const studentName =
    getStudentName(student);

  const paymentDescription =
    periodLabel
      ? `Your payment submission for ${periodLabel} was not approved.`
      : "Your course payment submission was not approved.";

  const safeReason =
    reason ||
    "Please review your payment details and submit a clearer payment slip.";

  const subject =
    "Action required: EconLLS payment not approved";

  const text = [
    `Hello ${studentName},`,
    "",
    paymentDescription,
    `Course: ${courseTitle}`,
    `Reason: ${safeReason}`,
    "",
    "Please submit a new payment slip.",
  ].join("\n");

  const html = createEmailLayout({
    previewText:
      "Your EconLLS payment needs attention.",

    heading:
      "Payment submission not approved",

    bodyHtml: `
      <p>
        Hello ${escapeHtml(studentName)},
      </p>

      <p>
        ${escapeHtml(paymentDescription)}
      </p>

      <p>
        <strong>Course:</strong>
        ${escapeHtml(courseTitle)}
      </p>

      <p>
        <strong>Reason:</strong>
        ${escapeHtml(safeReason)}
      </p>

      <p>
        Please submit a new payment slip
        after correcting the issue.
      </p>
    `,

    actionUrl,
    actionText: "View payment",
  });

  return {
    subject,
    text,
    html,
  };
};

export const createPaymentReminderEmail = ({
  student,
  courseTitle,
  periodLabel,
  deadlineLabel,
  daysRemaining,
  actionUrl,
}) => {
  const studentName = getStudentName(student);
  const timing =
    Number(daysRemaining) === 1
      ? "tomorrow"
      : `in ${daysRemaining} days`;
  const subject = `EconLLS payment reminder: ${courseTitle}`;

  const text = [
    `Hello ${studentName},`,
    "",
    `Your payment for ${courseTitle} (${periodLabel}) is due ${timing}.`,
    `Deadline: ${deadlineLabel}`,
    "",
    "Please upload your payment slip before the deadline to avoid interrupted access.",
  ].join("\n");

  const html = createEmailLayout({
    previewText: `Your EconLLS payment is due ${timing}.`,
    heading: "Upcoming payment deadline",
    bodyHtml: `
      <p>Hello ${escapeHtml(studentName)},</p>
      <p>
        Your payment for
        <strong>${escapeHtml(courseTitle)}</strong>
        (${escapeHtml(periodLabel)}) is due ${escapeHtml(timing)}.
      </p>
      <p>
        <strong>Deadline:</strong>
        ${escapeHtml(deadlineLabel)}
      </p>
      <p>
        Please upload your payment slip before the deadline to avoid interrupted access.
      </p>
    `,
    actionUrl,
    actionText: "Open payments",
  });

  return {
    subject,
    text,
    html,
  };
};

export const createCourseAccessSuspendedEmail = ({
  student,
  courseTitle,
  periodLabel,
  actionUrl,
}) => {
  const studentName = getStudentName(student);
  const subject = `Action required: ${courseTitle} access suspended`;
  const text = [
    `Hello ${studentName},`,
    "",
    `Your access to ${courseTitle} has been suspended because payment for ${periodLabel} was not approved by the end of the grace period.`,
    "A late payment slip may still be uploaded. Access will return after an administrator approves it.",
  ].join("\n");

  return {
    subject,
    text,
    html: createEmailLayout({
      previewText: `Payment is required to restore ${courseTitle} access.`,
      heading: "Course access suspended",
      bodyHtml: `
        <p>Hello ${escapeHtml(studentName)},</p>
        <p>
          Your access to <strong>${escapeHtml(courseTitle)}</strong> has been
          suspended because payment for ${escapeHtml(periodLabel)} was not
          approved by the end of the grace period.
        </p>
        <p>
          You may still upload a late payment slip. Access will return after
          an administrator approves it.
        </p>
      `,
      actionUrl,
      actionText: "Open payments",
    }),
  };
};

export const createPaymentSubmittedEmail = ({
  student,
  courseTitle,
  periodLabel,
  actionUrl,
}) => {
  const studentName = getStudentName(student);
  const target = periodLabel
    ? `${courseTitle} — ${periodLabel}`
    : courseTitle;
  const subject = "EconLLS payment slip received";
  const text = [
    `Hello ${studentName},`,
    "",
    `We received your payment slip for ${target}.`,
    "An administrator will review it and notify you of the decision.",
  ].join("\n");

  return {
    subject,
    text,
    html: createEmailLayout({
      previewText: "Your payment slip was received.",
      heading: "Payment slip received",
      bodyHtml: `
        <p>Hello ${escapeHtml(studentName)},</p>
        <p>We received your payment slip for <strong>${escapeHtml(target)}</strong>.</p>
        <p>An administrator will review it and notify you of the decision.</p>
      `,
      actionUrl,
      actionText: "View payments",
    }),
  };
};

export const createNicSubmittedEmail = ({ student, actionUrl }) => {
  const studentName = getStudentName(student);
  const subject = "EconLLS NIC image received";
  const text = [
    `Hello ${studentName},`,
    "",
    "We received your NIC image.",
    "An administrator will review it and notify you of the decision.",
  ].join("\n");

  return {
    subject,
    text,
    html: createEmailLayout({
      previewText: "Your NIC image was received.",
      heading: "NIC image received",
      bodyHtml: `
        <p>Hello ${escapeHtml(studentName)},</p>
        <p>We received your NIC image.</p>
        <p>An administrator will review it and notify you of the decision.</p>
      `,
      actionUrl,
      actionText: "View NIC status",
    }),
  };
};

export const createNicVerifiedEmail = ({
  student,
  actionUrl,
}) => {
  const studentName =
    getStudentName(student);

  const subject =
    "EconLLS identity document verified";

  const text = [
    `Hello ${studentName},`,
    "",
    "Your NIC image has been verified successfully.",
    "No further action is required.",
  ].join("\n");

  const html = createEmailLayout({
    previewText:
      "Your NIC image has been verified.",

    heading:
      "Identity document verified",

    bodyHtml: `
      <p>
        Hello ${escapeHtml(studentName)},
      </p>

      <p>
        Your NIC image has been verified
        successfully.
      </p>

      <p>
        No further action is required.
      </p>
    `,

    actionUrl,
    actionText: "View NIC status",
  });

  return {
    subject,
    text,
    html,
  };
};

export const createNicRejectedEmail = ({
  student,
  reason,
  actionUrl,
}) => {
  const studentName =
    getStudentName(student);

  const safeReason =
    reason ||
    "Please upload a clearer NIC image.";

  const subject =
    "Action required: upload a new NIC image";

  const text = [
    `Hello ${studentName},`,
    "",
    "Your NIC image could not be verified.",
    `Reason: ${safeReason}`,
    "",
    "Please upload a new image.",
  ].join("\n");

  const html = createEmailLayout({
    previewText:
      "Your NIC image needs attention.",

    heading:
      "Identity document not verified",

    bodyHtml: `
      <p>
        Hello ${escapeHtml(studentName)},
      </p>

      <p>
        Your NIC image could not be verified.
      </p>

      <p>
        <strong>Reason:</strong>
        ${escapeHtml(safeReason)}
      </p>

      <p>
        Please upload a clear replacement image.
      </p>
    `,

    actionUrl,
    actionText: "Update NIC image",
  });

  return {
    subject,
    text,
    html,
  };
};
