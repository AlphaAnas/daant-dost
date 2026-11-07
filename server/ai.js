import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

// One door to Claude. Every caller has a non-AI fallback, so the app keeps
// working without a key or when the API is slow, busy or refuses.

export const MODEL = process.env.AI_MODEL || "claude-opus-5-5";
export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY) && process.env.AI_DISABLED !== "1";

export class AiUnavailable extends Error {
  constructor(reason, cause) {
    super(`AI unavailable: ${reason}`);
    this.reason = reason;
    this.cause = cause;
  }
}

let client;
const getClient = () => {
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
};

// Asks for an object matching `schema` (a zod/v4 schema). Throws AiUnavailable.
export const askJson = async ({ system, prompt, schema, effort = "low", maxTokens = 4000 }) => {
  if (!aiEnabled()) throw new AiUnavailable("disabled");
  const started = Date.now();
  let res;
  try {
    res = await getClient().messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
      output_config: { effort, format: zodOutputFormat(schema) },
    });
  } catch (err) {
    throw new AiUnavailable("upstream", err);
  }
  if (res.stop_reason === "refusal") throw new AiUnavailable("refusal");
  if (!res.parsed_output) throw new AiUnavailable("unparseable");
  console.log(`[ai] ${effort} ${Date.now() - started}ms in=${res.usage?.input_tokens} out=${res.usage?.output_tokens}`);
  return res.parsed_output;
};
