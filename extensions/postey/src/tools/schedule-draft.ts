import { Tool } from "@raycast/api";
import { getPreferences } from "../lib/preferences";

type ApiErrorResponse = {
  error?: {
    message?: string;
    details?: Array<{ message?: string }>;
  };
};

type Input = {
  /** The ID of the draft to schedule. */
  draft_id: number;
  /** The social set ID the draft belongs to. */
  social_set_id: number;
  /** ISO 8601 date and time to schedule the draft for. */
  schedule_date: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const date = parseScheduleDate(input.schedule_date);
  return {
    message: `Schedule draft #${input.draft_id} for ${date.toLocaleString()}?`,
  };
};

function parseScheduleDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid schedule_date. Use ISO 8601 date-time with timezone.");
  }
  if (date.getTime() <= Date.now()) {
    throw new Error("schedule_date must be in the future.");
  }
  return date;
}

function parseApiError(message: string, body: unknown) {
  const apiError = body as ApiErrorResponse | undefined;
  const mainMessage = apiError?.error?.message;
  const details = apiError?.error?.details
    ?.map((detail) => detail.message)
    .filter(Boolean)
    .join(", ");
  if (mainMessage && details) {
    return `${mainMessage}: ${details}`;
  }
  if (mainMessage) {
    return mainMessage;
  }
  return message;
}

export default async function tool(input: Input) {
  const { apiKey } = getPreferences();
  if (!apiKey) {
    throw new Error("Missing Postey API key.");
  }

  const publishAt = parseScheduleDate(input.schedule_date).toISOString();
  const payload = { publish_at: publishAt };
  const path = `https://srvr.postey.ai/v1/posts/${input.draft_id}?account=${input.social_set_id}`;

  const response = await fetch(path, {
    method: "PATCH",
    headers: {
      "X-API-Key": apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    let body: unknown = undefined;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = undefined;
      }
    }
    throw new Error(parseApiError(`Failed to schedule draft (status ${response.status})`, body));
  }

  const result = (await response.json()) as {
    id?: number;
    social_set_id?: number;
    status?: string;
    scheduled_date?: string | null;
    private_url?: string | null;
  };

  return {
    id: result.id ?? input.draft_id,
    social_set_id: result.social_set_id ?? input.social_set_id,
    status: result.status ?? "scheduled",
    scheduled_date: result.scheduled_date ?? publishAt,
    url: result.private_url ?? null,
  };
}
