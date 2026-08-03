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

const parseResponseBody = async (
  response
) => {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    try {
      return await response.json();
    } catch {
      return {
        message:
          "The server returned invalid JSON.",
      };
    }
  }

  const text =
    await response.text();

  return text
    ? {
        message: text,
      }
    : null;
};

const createApiError = (
  response,
  data
) => {
  return new ApiError(
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
};

const performFetch = async (
  path,
  options
) => {
  try {
    return await fetch(
      `${API_BASE_URL}${path}`,
      {
        credentials: "include",
        ...options,
      }
    );
  } catch (error) {
    if (
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new ApiError(
      "The server could not be reached. Check that the API is running.",
      {
        details: error,
      }
    );
  }
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

    requestBody =
      JSON.stringify(body);
  }

  const response =
    await performFetch(path, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal,
    });

  const data =
    await parseResponseBody(
      response
    );

  if (!response.ok) {
    throw createApiError(
      response,
      data
    );
  }

  return data;
};

export const apiBlobRequest = async (
  path,
  {
    method = "GET",
    headers,
    signal,
  } = {}
) => {
  const response =
    await performFetch(path, {
      method,
      headers:
        new Headers(headers),
      signal,
    });

  if (!response.ok) {
    const data =
      await parseResponseBody(
        response
      );

    throw createApiError(
      response,
      data
    );
  }

  return {
    blob: await response.blob(),

    contentType:
      response.headers.get(
        "content-type"
      ) || "",

    contentDisposition:
      response.headers.get(
        "content-disposition"
      ) || "",
  };
};
