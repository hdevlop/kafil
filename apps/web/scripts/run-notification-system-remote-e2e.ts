/** Guarded black-box runner for the isolated notification system journey. */

import {
  buildRemoteNotificationsPlaywrightArgs,
  readRemoteNotificationsGrep,
} from "./connected-four-account-remote-runtime";
import { runRemoteAcceptance } from "./remote-acceptance-runner";

const exitCode = await runRemoteAcceptance({
  buildPlaywrightArgs: () =>
    buildRemoteNotificationsPlaywrightArgs(
      readRemoteNotificationsGrep(Bun.env),
    ),
  extraReadinessPaths: ["/notifications"],
  passLabel: "remote notification system acceptance",
  rejectRemoteAuthGrep: true,
  rejectRemoteGrep: true,
});

process.exit(exitCode);
