const ZOOM_API_BASE_URL =
  "https://api.zoom.us/v2";

const ZOOM_TOKEN_URL =
  "https://zoom.us/oauth/token";

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

export class ZoomApiError extends Error {
  constructor({
    message,
    status,
    code,
    details,
  }) {
    super(message);

    this.name = "ZoomApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const validateZoomConfiguration = () => {
  const requiredVariables = [
    "ZOOM_ACCOUNT_ID",
    "ZOOM_CLIENT_ID",
    "ZOOM_CLIENT_SECRET",
  ];

  const missing = requiredVariables.filter(
    (name) => !process.env[name]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing Zoom variables: ${missing.join(
        ", "
      )}`
    );
  }
};

export const normalizeZoomMeetingId = (
  meetingId
) => {
  return String(meetingId || "").replace(
    /\D/g,
    ""
  );
};

const getZoomAccessToken = async ({
  forceRefresh = false,
} = {}) => {
  validateZoomConfiguration();

  const now = Date.now();

  if (
    !forceRefresh &&
    tokenCache.accessToken &&
    tokenCache.expiresAt >
      now + 60_000
  ) {
    return tokenCache.accessToken;
  }

  const credentials = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString("base64");

  const query = new URLSearchParams({
    grant_type: "account_credentials",
    account_id:
      process.env.ZOOM_ACCOUNT_ID,
  });

  const response = await fetch(
    `${ZOOM_TOKEN_URL}?${query.toString()}`,
    {
      method: "POST",

      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new ZoomApiError({
      message:
        data.reason ||
        data.error_description ||
        "Zoom authentication failed.",

      status: response.status,
      code: data.error,
      details: data,
    });
  }

  tokenCache = {
    accessToken: data.access_token,

    expiresAt:
      Date.now() +
      Number(data.expires_in || 3600) *
        1000,
  };

  return tokenCache.accessToken;
};

const zoomRequest = async (
  path,
  {
    method = "GET",
    body,
    query,
    retryAuthentication = true,
  } = {}
) => {
  const accessToken =
    await getZoomAccessToken();

  const queryString = query
    ? `?${new URLSearchParams(
        query
      ).toString()}`
    : "";

  const response = await fetch(
    `${ZOOM_API_BASE_URL}${path}${queryString}`,
    {
      method,

      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",

        ...(body && {
          "Content-Type":
            "application/json",
        }),
      },

      ...(body && {
        body: JSON.stringify(body),
      }),
    }
  );

  if (
    response.status === 401 &&
    retryAuthentication
  ) {
    await getZoomAccessToken({
      forceRefresh: true,
    });

    return zoomRequest(path, {
      method,
      body,
      query,
      retryAuthentication: false,
    });
  }

  if (response.status === 204) {
    return null;
  }

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new ZoomApiError({
      message:
        data.message ||
        "Zoom API request failed.",

      status: response.status,
      code: data.code,
      details: data,
    });
  }

  return data;
};

export const getZoomMeeting = async (
  meetingId
) => {
  const normalizedMeetingId =
    normalizeZoomMeetingId(meetingId);

  if (!normalizedMeetingId) {
    throw new ZoomApiError({
      message:
        "A valid Zoom meeting ID is required.",
      status: 400,
    });
  }

  return zoomRequest(
    `/meetings/${normalizedMeetingId}`
  );
};

export const addZoomMeetingRegistrant =
  async ({
    meetingId,
    email,
    firstName,
    lastName,
    phone,
  }) => {
    return zoomRequest(
      `/meetings/${normalizeZoomMeetingId(
        meetingId
      )}/registrants`,
      {
        method: "POST",

        body: {
          email,
          first_name: firstName,
          last_name: lastName || "",
          phone: phone || "",
          language: "en-US",
          auto_approve: true,
        },
      }
    );
  };

export const findZoomRegistrantByEmail =
  async ({
    meetingId,
    email,
  }) => {
    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const statuses = [
      "approved",
      "pending",
    ];

    for (const status of statuses) {
      let nextPageToken = "";

      do {
        const response = await zoomRequest(
          `/meetings/${normalizeZoomMeetingId(
            meetingId
          )}/registrants`,
          {
            query: {
              status,
              page_size: "300",

              ...(nextPageToken && {
                next_page_token:
                  nextPageToken,
              }),
            },
          }
        );

        const registrant =
          response.registrants?.find(
            (item) =>
              String(item.email)
                .trim()
                .toLowerCase() ===
              normalizedEmail
          );

        if (registrant) {
          return registrant;
        }

        nextPageToken =
          response.next_page_token || "";
      } while (nextPageToken);
    }

    return null;
  };