import { access, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export async function assertFileExists(path, message) {
  try {
    await access(path);
  } catch {
    throw new Error(message ?? `Expected file to exist: ${path}`);
  }
}

export async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}