export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// JSON to and from the DaantDost API. Errors carry a message fit to show.
export const api = async (path, { method = "GET", body } = {}) => {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the DaantDost server. Is it running?");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Empty or non-JSON body.
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || "Something went wrong. Please try again.");
  return data;
};
