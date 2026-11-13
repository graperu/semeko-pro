"use strict";
const assert = require("assert"),
  fs = require("fs"),
  os = require("os"),
  path = require("path"),
  Module = require("module");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "semeko-runtime-edges-")),
  load = Module._load,
  events = [];
Module._load = function (name, ...args) {
  if (name === "electron")
    return {
      app: {
        getPath: () => root,
        getAppPath: () => path.resolve(__dirname, "../.."),
        isPackaged: false,
      },
    };
  if (name === "../languages/runtime")
    return {
      resolveRun: (file) => ({
        command: process.execPath,
        args: [file],
        cwd: root,
        managed: true,
      }),
    };
  if (name === "./run-launcher" || name === "../compiler/run-launcher")
    return {
      getLauncherIfReady: () => null,
      readStats: () => null,
      newStatsFile: () => null,
    };
  return load.call(this, name, ...args);
};
const executor = require("../../app/services/compiler/executor"),
  batch = require("../../app/services/competitive/batch-tester");
executor.setSendToRendererCallback((channel, data) =>
  events.push({ channel, data }),
);
const fixture = (name, code) => {
  const file = path.join(root, name + ".js");
  fs.writeFileSync(file, code);
  return file;
};
const wait = async (predicate) => {
  for (let i = 0; i < 500; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw Error("Timed out");
};
const bound = (p) =>
  Promise.race([
    p,
    new Promise((_, reject) => {
      const timer = setTimeout(
        () => reject(Error("Input upload did not settle")),
        2000,
      );
      timer.unref();
    }),
  ]);
(async () => {
  const linger = fixture(
    "linger",
    'process.stdin.resume();process.stdin.on("end",()=>setTimeout(()=>process.exit(0),100));',
  );
  await executor.run({ exePath: linger });
  executor.getRunningProcess().stdin.end();
  assert.strictEqual(executor.sendInput("after EOF").success, false);
  await wait(() => !executor.isProcessRunning());
  const input = path.join(root, "large.txt");
  fs.writeFileSync(input, Buffer.alloc(16 * 1024 * 1024, 65));
  const early = fixture("early", "setTimeout(()=>process.exit(0),100);");
  await executor.run({ exePath: early });
  const exited = await bound(executor.sendInputFile(input));
  assert.strictEqual(exited.success, false);
  await wait(() => !executor.isProcessRunning());
  const idle = fixture("idle", "setInterval(()=>{},1000);");
  await executor.run({ exePath: idle });
  const uploading = executor.sendInputFile(input);
  await new Promise((r) => setTimeout(r, 30));
  executor.stopProcess();
  assert.strictEqual((await bound(uploading)).success, false);
  const echo = fixture(
    "echo",
    'process.stdin.on("data",d=>process.stdout.write(d));',
  );
  const small = path.join(root, "small.txt");
  fs.writeFileSync(small, "  spaced input");
  events.length = 0;
  await executor.run({ exePath: echo });
  assert((await executor.sendInputFile(small)).success);
  executor.getRunningProcess().stdin.end();
  await wait(() => !executor.isProcessRunning());
  assert.strictEqual(
    events
      .filter((e) => e.channel === "process-output")
      .map((e) => e.data)
      .join(""),
    "  spaced input\n",
  );
  const cap = 16 * 1024 * 1024;
  for (const [channel, count, status] of [
    ["stdout", cap, "AC"],
    ["stdout", cap + 1, "RE"],
    ["stderr", cap + 1, "RE"],
  ]) {
    const output = fixture(
      "output-" + channel + "-" + count,
      `process.${channel}.write('x'.repeat(${count}));`,
    );
    const result = await batch.runTest({
      exePath: output,
      input: "",
      timeLimit: 5000,
    });
    assert.strictEqual(result.status, status);
    assert(result.output.length <= cap && result.error.length <= cap);
    if (status === "RE") assert(result.details.includes("Output limit"));
  }
  console.log(
    "PASS real subprocess EOF-write rejection, early-exit/upload cancellation settles, normal file input preserves whitespace, exact/overflow stdout+stderr capture limits",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    executor.stopProcess();
    Module._load = load;
  });
