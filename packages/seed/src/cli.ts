import { fileURLToPath } from "node:url";

import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  outro,
  password,
  select,
  text,
} from "@clack/prompts";

import {
  demoCountArgs,
  parseSeedCliArgs,
  seedCountValidation,
  type SeedCliCommand,
  seedCliHelp,
} from "./seed-cli";
import {
  normalizeAdminEmail,
  validateAdminEmail,
  validateAdminPassword,
  validateAdminPasswordConfirmation,
} from "./seed-config";
import { DEFAULT_DEMO_SEED_COUNTS } from "./scripts/demo/generator";

const COMMAND_LABELS: Readonly<Record<SeedCliCommand, string>> = {
  setup: "Reset app data",
  demo: "Add/repair demo",
  remove: "Remove demo data",
  full: "Reset and seed all",
  migrate: "Run migrations",
  admin: "Repair admin access",
  categories: "Seed categories",
  verify: "Verify auth",
  images: "Check images",
};

const INTERACTIVE_COMMAND_ORDER: readonly SeedCliCommand[] = [
  "full",
  "demo",
  "remove",
  "setup",
  "migrate",
  "admin",
  "categories",
  "verify",
  "images",
];

const COMMAND_SCRIPTS: Readonly<
  Record<Exclude<SeedCliCommand, "full">, string>
> = {
  setup: "src/index.ts",
  demo: "src/scripts/demo/seed-demo.ts",
  remove: "src/scripts/remove-demo.ts",
  migrate: "src/scripts/migrate.ts",
  admin: "src/scripts/seed-admin.ts",
  categories: "src/scripts/seed-categories.ts",
  verify: "src/scripts/verify.ts",
  images: "src/scripts/demo/list-images.ts",
};

async function main() {
  let options;
  try {
    options = parseSeedCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\n" + seedCliHelp());
    return 1;
  }

  if (options.help) {
    console.log(seedCliHelp());
    return 0;
  }

  const terminalAvailable =
    Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY);
  const interactive = options.command === undefined && terminalAvailable;
  if (!options.command && !interactive) {
    console.log(seedCliHelp());
    return 0;
  }
  if (interactive) intro("Kafil seed CLI");

  const command = options.command ?? (await selectInteractiveCommand());
  if (!command) {
    if (interactive) cancel("Seed cancelled; no data was changed.");
    else console.log(seedCliHelp());
    return 0;
  }

  let passthrough = options.passthrough;
  let childEnvironment: Record<string, string> | undefined;
  if (terminalAvailable && command === "admin") {
    const credentials = await promptAdminCredentials();
    if (!credentials) return 0;
    childEnvironment = {
      KAFIL_ADMIN_EMAIL: credentials.email,
      KAFIL_ADMIN_INTERACTIVE: "1",
      KAFIL_ADMIN_PASSWORD: credentials.password,
    };
  }
  if (
    terminalAvailable &&
    (command === "demo" || command === "full") &&
    options.passthrough.length === 0
  ) {
    const counts = await promptDemoCounts();
    if (!counts) return 0;
    passthrough = demoCountArgs(counts);
  }

  if (
    (command === "setup" || command === "full" || command === "remove") &&
    !options.yes &&
    !(await confirmDestructiveCommand(command))
  ) {
    cancel("Seed cancelled; no data was changed.");
    return 0;
  }

  if (command === "full") {
    const setupExitCode = await runScript(COMMAND_SCRIPTS.setup, []);
    if (setupExitCode !== 0) return setupExitCode;
    const exitCode = await runScript(COMMAND_SCRIPTS.demo, passthrough);
    if (interactive && exitCode === 0) outro("Kafil full seed completed.");
    return exitCode;
  }

  const exitCode = await runScript(
    COMMAND_SCRIPTS[command],
    passthrough,
    childEnvironment,
  );
  if (interactive && exitCode === 0) {
    outro(`${COMMAND_LABELS[command]} completed.`);
  }
  return exitCode;
}

async function promptAdminCredentials() {
  intro("Kafil admin seed");

  const configuredEmail =
    process.env.KAFIL_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
  const email = await text({
    message: "Admin email",
    initialValue: configuredEmail
      ? normalizeAdminEmail(configuredEmail)
      : undefined,
    validate: (value) => validationMessage(() => validateAdminEmail(value)),
  });
  if (isCancel(email)) return cancelAdminSeed();

  const adminPassword = await password({
    message: "Admin password",
    clearOnError: true,
    validate: (value) =>
      validationMessage(() => validateAdminPassword(value)),
  });
  if (isCancel(adminPassword)) return cancelAdminSeed();

  const confirmation = await password({
    message: "Confirm admin password",
    clearOnError: true,
    validate: (value) =>
      validationMessage(() =>
        validateAdminPasswordConfirmation(adminPassword, value),
      ),
  });
  if (isCancel(confirmation)) return cancelAdminSeed();

  return {
    email: validateAdminEmail(email),
    password: validateAdminPassword(adminPassword),
  };
}

function validationMessage(validate: () => unknown) {
  try {
    validate();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function cancelAdminSeed() {
  cancel("Admin seed cancelled; no data was changed.");
  return undefined;
}

async function selectInteractiveCommand(): Promise<SeedCliCommand | undefined> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return undefined;

  const command = await select<SeedCliCommand>({
    message: "Choose an action",
    initialValue: "full",
    options: INTERACTIVE_COMMAND_ORDER.map((value) => ({
      value,
      label: COMMAND_LABELS[value],
      hint:
        value === "full"
          ? "recommended"
          : value === "remove"
            ? "demo only"
          : value === "setup"
            ? "all app data"
            : undefined,
    })),
  });
  return isCancel(command) ? undefined : command;
}

async function promptDemoCounts() {
  const families = await promptCount(
    "How many families?",
    DEFAULT_DEMO_SEED_COUNTS.families,
  );
  if (families === undefined) return undefined;
  const sponsors = await promptCount(
    "How many sponsors?",
    DEFAULT_DEMO_SEED_COUNTS.sponsors,
  );
  if (sponsors === undefined) return undefined;
  const operators = await promptCount(
    "How many operators?",
    DEFAULT_DEMO_SEED_COUNTS.operators,
  );
  if (operators === undefined) return undefined;
  const contributions = await promptCount(
    "How many contributions?",
    DEFAULT_DEMO_SEED_COUNTS.contributions,
    (count) =>
      count > 0 && (families === 0 || sponsors === 0)
        ? "Contributions require at least one family and one sponsor."
        : undefined,
  );
  if (contributions === undefined) return undefined;

  log.info(
    `Demo data: ${families} families, ${sponsors} sponsors, ${operators} operators, ${contributions} contributions.`,
  );
  return { contributions, families, operators, sponsors };
}

async function promptCount(
  message: string,
  initialValue: number,
  extraValidation?: (count: number) => string | undefined,
) {
  const answer = await text({
    message,
    initialValue: String(initialValue),
    validate: (value) => {
      const error = seedCountValidation(value);
      return error ?? extraValidation?.(Number(value));
    },
  });
  if (isCancel(answer)) {
    cancel("Seed cancelled; no data was changed.");
    return undefined;
  }
  return Number(answer);
}

async function confirmDestructiveCommand(
  command: "setup" | "full" | "remove",
) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      `'${command}' requires --yes outside an interactive terminal.`,
    );
  }

  const answer = await confirm({
    message:
      command === "remove"
        ? "Remove managed demo data and reset products/categories?"
        : "Clear all app data and managed files?",
    initialValue: false,
  });
  return isCancel(answer) ? false : answer;
}

async function runScript(
  script: string,
  args: readonly string[],
  environmentOverrides?: Readonly<Record<string, string>>,
) {
  const command = `${script}${args.length ? ` ${args.join(" ")}` : ""}`;
  if (process.stdout.isTTY) log.step(`Running ${command}`);
  else console.log(`Running: ${command}`);
  const child = Bun.spawn({
    cmd: [process.execPath, script, ...args],
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: {
      ...process.env,
      ...environmentOverrides,
    },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  return child.exited;
}

try {
  process.exitCode = await main();
} catch (error) {
  process.exitCode = 1;
  console.error(error instanceof Error ? error.message : String(error));
}
