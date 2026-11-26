// Runs the API and web dev servers side by side with prefixed output.
import { spawn } from "node:child_process";

const procs = [
  { name: "api", color: "\x1b[35m", args: ["run", "dev", "-w", "@maa/api"] },
  { name: "web", color: "\x1b[36m", args: ["run", "dev", "-w", "@maa/web"] },
];

const children = procs.map(({ name, color, args }) => {
  const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on("data", (buf) =>
      buf
        .toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((line) => out.write(prefix + line + "\n")),
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    console.log(`${prefix}exited with code ${code}`);
    children.forEach((c) => c.kill());
    process.exit(code ?? 0);
  });
  return child;
});

process.on("SIGINT", () => children.forEach((c) => c.kill("SIGINT")));
