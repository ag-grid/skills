import { spawn } from "node:child_process";
import { simulateUser, type AnswerLogEntry } from "./simulator.ts";
import { report } from "./report.ts";
import type { AnswerEntry, InteractionResult } from "./types.ts";
import type { JsonlLog } from "./log.ts";

/** Short human-readable summary of a tool_use block for live output. */
function toolSummary(block: any): string {
  const name = block?.name ?? "tool";
  const inp = block?.input ?? {};
  let detail = "";
  if (typeof inp.command === "string") detail = inp.command;
  else if (typeof inp.file_path === "string") detail = inp.file_path;
  else if (typeof inp.path === "string") detail = inp.path;
  else if (typeof inp.url === "string") detail = inp.url;
  else {
    try { detail = JSON.stringify(inp); } catch { detail = ""; }
  }
  detail = detail.replace(/\s+/g, " ").trim().slice(0, 100);
  return detail ? `${name}: ${detail}` : name;
}

const DEFAULT_TIMEOUT_MS = 240_000;
const DEBOUNCE_MS = 1000;

/**
 * Drive the real `claude` CLI as a streaming-JSON subprocess. Read assistant
 * text from stdout; after a debounce, let the simulator decide what to do; write
 * answers back to stdin. We never inspect OS-level process state - stdin is
 * consumed when the CLI next reads it, and the simulator decides done/no_match
 * from the conversation content, not from event shape.
 */
export function runAgentSession(opts: {
  prompt: string;
  cwd: string;
  model?: string;
  simModel?: string;
  answers: AnswerEntry[];
  log: JsonlLog;
}): Promise<InteractionResult> {
  return new Promise((resolve) => {
    const debounceMs = DEBOUNCE_MS;
    const timeoutMs = DEFAULT_TIMEOUT_MS;

    const child = spawn(
      "claude",
      [
        "-p",
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--verbose",
        "--model",
        opts.model ?? "sonnet",
        "--permission-mode",
        "bypassPermissions",
      ],
      { cwd: opts.cwd, stdio: ["pipe", "pipe", "pipe"] },
    );

    const userFacing: string[] = [];
    const answerLog: AnswerLogEntry[] = [];
    let answersSent = 0;
    let noMatch = false;
    let timedOut = false;
    let finished = false;
    let debounceTimer: NodeJS.Timeout | null = null;
    let idleTimer: NodeJS.Timeout | null = null;
    let stdoutBuf = "";

    const sendUser = (text: string) => {
      const msg = {
        type: "user",
        message: { role: "user", content: [{ type: "text", text }] },
      };
      child.stdin.write(JSON.stringify(msg) + "\n");
      opts.log.write({ dir: "in", text });
      report.user(text);
    };

    const finalize = (reason: string, exitCode: number | null) => {
      if (finished) return;
      finished = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (idleTimer) clearTimeout(idleTimer);
      try {
        child.stdin.end();
      } catch {}
      try {
        child.kill();
      } catch {}
      opts.log.write({
        event: "finalize",
        reason,
        answersSent,
        noMatch,
        timedOut,
      });
      report.info(`session ended: ${reason}`);
      resolve({
        answersSent,
        noMatch,
        timedOut,
        exitCode,
        finalText: userFacing[userFacing.length - 1] ?? "",
        transcript: userFacing.join("\n\n"),
      });
    };

    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        timedOut = true;
        finalize("idle-timeout", null);
      }, timeoutMs);
    };

    const onDebounce = () => {
      if (finished) return;
      const action = simulateUser({
        answers: opts.answers,
        answerLog,
        transcript: userFacing.join("\n\n"),
        model: opts.simModel,
      });
      opts.log.write({ event: "simulator", action });
      if (action.action === "answer") {
        answersSent++;
        answerLog.push({
          question: userFacing[userFacing.length - 1] ?? "",
          reply: action.reply,
        });
        sendUser(action.reply);
      } else if (action.action === "done") {
        finalize("simulator-done", null);
      } else if (action.action === "no_match") {
        report.sim("NO MATCH — question not covered by the answer map", true);
        noMatch = true;
        finalize("no-match", null);
      }
      // "wait": keep listening silently; next text re-arms the debounce.
    };

    const armDebounce = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(onDebounce, debounceMs);
    };

    const handleEvent = (evt: any) => {
      opts.log.write({ dir: "out", evt });
      if (evt.type === "assistant" && Array.isArray(evt.message?.content)) {
        const texts = evt.message.content
          .filter((c: any) => c.type === "text" && c.text?.trim())
          .map((c: any) => c.text);
        if (texts.length) {
          const text = texts.join("\n");
          userFacing.push(text);
          report.agent(text);
          armDebounce();
          armIdle();
        }
        for (const c of evt.message.content) {
          if (c.type === "tool_use") {
            report.tool(toolSummary(c));
            armIdle();
          }
        }
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuf += chunk.toString();
      let nl: number;
      while ((nl = stdoutBuf.indexOf("\n")) >= 0) {
        const line = stdoutBuf.slice(0, nl).trim();
        stdoutBuf = stdoutBuf.slice(nl + 1);
        if (!line) continue;
        try {
          handleEvent(JSON.parse(line));
        } catch {
          opts.log.write({ dir: "out-raw", line });
        }
      }
    });
    child.stderr.on("data", (c: Buffer) =>
      opts.log.write({ dir: "err", text: c.toString() }),
    );
    child.on("error", (e) => {
      opts.log.write({ event: "spawn-error", error: String(e) });
      finalize("spawn-error", null);
    });
    child.on("exit", (code) => finalize("process-exit", code ?? null));

    sendUser(opts.prompt);
    armIdle();
  });
}
