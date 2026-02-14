import { Tool } from "@raycast/api";

type Input = {
  /** The ID of the draft to schedule. */
  draft_id: number;
  /** The social set ID the draft belongs to. */
  social_set_id: number;
  /** ISO 8601 date and time to schedule the draft for. */
  schedule_date: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const date = new Date(input.schedule_date);
  return {
    message: `Schedule draft #${input.draft_id} for ${date.toLocaleString()}?`,
  };
};

export default async function tool() {
  return { msg: "Coming Soon" };
}
