import { appendFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

/** Append-only JSONL log of everything that happens in a run. */
export class JsonlLog {
  private path: string;
  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
    rmSync(path, { force: true });
  }
  write(obj: unknown): void {
    appendFileSync(this.path, JSON.stringify(obj) + "\n");
  }
}
