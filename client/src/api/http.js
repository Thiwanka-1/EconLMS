const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = String(
  rawApiBaseUrl || ""
).replace(/\/+$/, "");

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL is not configured."
  );
}

export class ApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      requestId = null,
      details = null,
    } = {}
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.requestId = requestId;
    this.details = details;
  }
}

const parseResponseBody = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType.includes("application/json")
  ) {
    return response.json();
  }

  const text = await response.text();

  return text
    ? {
        message: text,
      }
    : null;
};

export const apiRequest = async (
  path,
  {
    method = "GET",
    body,
    headers,
    signal,
  } = {}
) => {
  const requestHeaders =
    new Headers(headers);

  let requestBody = body;

  if (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    typeof body !== "string"
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json"
    );

    requestBody = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        method,
        credentials: "include",
        headers: requestHeaders,
        body: requestBody,
        signal,
      }
    );
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "The server could not be reached. Check that the API is running.",
      {
        details: error,
      }
    );
  }

  const data =
    await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      data?.message ||
        "The request could not be completed.",
      {
        status: response.status,
        requestId:
          data?.requestId ||
          response.headers.get(
            "x-request-id"
          ),
        details: data,
      }
    );
  }

  return data;
};
