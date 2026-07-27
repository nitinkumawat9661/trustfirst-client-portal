type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
  ok?: boolean;
};

export type HardwareApiResult<T> =
  | { data: T; ok: true }
  | { message: string; ok: false };

export async function postHardwareJson<T>(
  endpoint: string,
  body?: unknown,
): Promise<HardwareApiResult<T>> {
  try {
    const response = await fetch(endpoint, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    const result = await readEnvelope<T>(response);
    if (!response.ok || !result.ok) {
      return {
        message: result.error?.message ?? "The request could not be completed.",
        ok: false,
      };
    }
    return { data: result.data as T, ok: true };
  } catch {
    return {
      message: "The server could not be reached. Check the connection and retry.",
      ok: false,
    };
  }
}

export async function getHardwareJson<T>(endpoint: string): Promise<HardwareApiResult<T>> {
  try {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    const result = await readEnvelope<T>(response);
    if (!response.ok || !result.ok) {
      return {
        message: result.error?.message ?? "The request could not be completed.",
        ok: false,
      };
    }
    return { data: result.data as T, ok: true };
  } catch {
    return {
      message: "The server could not be reached. Check the connection and retry.",
      ok: false,
    };
  }
}

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  try {
    return await response.json() as ApiEnvelope<T>;
  } catch {
    return {};
  }
}
