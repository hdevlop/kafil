/** Guarded black-box runner for the disposable four-account VPS journey. */

import { buildRemotePlaywrightArgs, readRemoteGrep } from "./connected-four-account-remote-runtime";
import { runRemoteAcceptance } from "./remote-acceptance-runner";

const exitCode = await runRemoteAcceptance({
  buildPlaywrightArgs: () => buildRemotePlaywrightArgs(readRemoteGrep(Bun.env)),
  passLabel: "remote connected acceptance",
});

process.exit(exitCode);
