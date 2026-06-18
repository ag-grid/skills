import { execFileSync } from "node:child_process";
import type { AnswerEntry } from "./types.ts";

export type SimAction =
  | { action: "answer"; reply: string; when: string }
  | { action: "wait" }
  | { action: "done" }
  | { action: "no_match" };

export interface AnswerLogEntry {
  question: string;
  reply: string;
}

/**
 * Ask a fast model to play the user: given the conversation so far and the
 * predefined answer map, decide whether to answer (only from the map), wait,
 * declare done, or signal that no map entry matches (a test failure).
 */
export function simulateUser(opts: {
  answers: AnswerEntry[];
  answerLog: AnswerLogEntry[];
  transcript: string;
  model?: string;
}): SimAction {
  const prompt = buildPrompt(opts);
  let raw: string;
  try {
    raw = execFileSync(
      "claude",
      ["-p", "--model", opts.model ?? "haiku", "--output-format", "json"],
      { input: prompt, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
    );
  } catch {
    return { action: "wait" };
  }
  let text = "";
  try {
    text = JSON.parse(raw).result ?? "";
  } catch {
    return { action: "wait" };
  }
  return parseAction(text);
}

function buildPrompt(opts: {
  answers: AnswerEntry[];
  answerLog: AnswerLogEntry[];
  transcript: string;
}): string {
  const answersJson = JSON.stringify(opts.answers, null, 2);
  const logJson =
    opts.answerLog.length > 0 ? JSON.stringify(opts.answerLog, null, 2) : "none";
  return `You are simulating a human user interacting with an AI agent in an automated test.

Decide whether the agent's latest message asks the user a question that needs an answer. If it does, answer ONLY using the ANSWER MAP below. Never invent information that is not in the map.

ANSWER MAP (each entry: "when" describes a question the user might be asked, "reply" is what to say):
${answersJson}

ANSWERS ALREADY GIVEN this session (do not repeat unless the agent clearly asks again):
${logJson}

CONVERSATION SO FAR (the agent's user-facing messages, oldest first, newest last):
${opts.transcript || "(nothing yet)"}

Reply with EXACTLY ONE JSON object and nothing else:
- {"action":"answer","reply":"<text from the matching map entry>","when":"<the matched entry's exact \\"when\\" string>"} - the agent is asking something covered by the map and not already answered.
- {"action":"wait"} - the agent is only showing progress/thinking, or has not asked a new question.
- {"action":"done"} - the agent has finished its task and is not waiting for any input.
- {"action":"no_match"} - the agent is asking a question that is NOT covered by the answer map.`;
}

function parseAction(text: string): SimAction {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { action: "wait" };
  let obj: any;
  try {
    obj = JSON.parse(text.slice(start, end + 1));
  } catch {
    return { action: "wait" };
  }
  switch (obj.action) {
    case "answer":
      return { action: "answer", reply: String(obj.reply ?? ""), when: String(obj.when ?? "") };
    case "done":
      return { action: "done" };
    case "no_match":
      return { action: "no_match" };
    default:
      return { action: "wait" };
  }
}
