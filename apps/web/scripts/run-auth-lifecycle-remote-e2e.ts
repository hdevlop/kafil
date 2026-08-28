/** Guarded black-box runner for the isolated remote auth lifecycle matrix. */

import { buildRemoteAuthPlaywrightArgs } from "./connected-four-account-remote-runtime";
import { runRemoteAcceptance } from "./remote-acceptance-runner";

const exitCode = await runRemoteAcceptance({
  buildPlaywrightArgs: () => buildRemoteAuthPlaywrightArgs(),
  passLabel: "remote auth lifecycle acceptance",
  rejectRemoteGrep: true,
});

process.exit(exitCode);
