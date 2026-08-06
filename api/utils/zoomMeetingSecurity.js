const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const isMatchingEmailAuthenticationName = (
  value
) => {
  const name = normalizeText(value);

  return (
    name.includes("email") &&
    (name.includes("invited") ||
      name.includes("registered") ||
      name.includes("registration")) &&
    (name.includes("associated") ||
      name.includes("match"))
  );
};

/*
 * Zoom returns an opaque authentication-option
 * ID. When ZOOM_REQUIRED_AUTHENTICATION_OPTION
 * is configured, use that exact ID. Otherwise,
 * accept only Zoom's matching-registration-email
 * profile name (including minor wording changes).
 */
export const getZoomMeetingSecurityIssues = (
  zoomMeeting,
  {
    requiredAuthenticationOption =
      process.env
        .ZOOM_REQUIRED_AUTHENTICATION_OPTION,
  } = {}
) => {
  const settings =
    zoomMeeting?.settings || {};

  const issues = [];

  if (settings.approval_type !== 1) {
    issues.push(
      "Registration must use manual approval so only EconLMS-approved students are admitted."
    );
  }

  if (settings.show_join_info === true) {
    issues.push(
      "Show join info on the registration confirmation page must be disabled."
    );
  }

  if (
    settings.meeting_authentication !==
    true
  ) {
    issues.push(
      "Require authentication to join must be enabled."
    );
  }

  const authenticationOption =
    String(
      settings.authentication_option ||
        ""
    ).trim();

  if (!authenticationOption) {
    issues.push(
      "A Zoom authentication profile must be selected."
    );
  }

  const requiredOption = String(
    requiredAuthenticationOption || ""
  ).trim();

  if (
    requiredOption &&
    authenticationOption &&
    authenticationOption !== requiredOption
  ) {
    issues.push(
      "The meeting does not use the Zoom authentication profile configured for EconLMS."
    );
  }

  if (
    !requiredOption &&
    authenticationOption &&
    !isMatchingEmailAuthenticationName(
      settings.authentication_name
    )
  ) {
    issues.push(
      'Select Zoom\'s "Signed in to account associated with invited email" authentication profile.'
    );
  }

  return issues;
};

export const describeZoomAuthentication = (
  zoomMeeting
) => ({
  enabled:
    zoomMeeting?.settings
      ?.meeting_authentication === true,
  name:
    zoomMeeting?.settings
      ?.authentication_name || "",
  option:
    zoomMeeting?.settings
      ?.authentication_option || "",
});
