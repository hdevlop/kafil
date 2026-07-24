export const SEED_CLI_COMMANDS = [
  "setup",
  "demo",
  "full",
  "migrate",
  "admin",
  "verify",
  "images",
] as const;

export type SeedCliCommand = (typeof SEED_CLI_COMMANDS)[number];

export interface SeedCliOptions {
  command?: SeedCliCommand;
  help: boolean;
  passthrough: string[];
  yes: boolean;
}

export interface SeedCliDemoCounts {
  contributions: number;
  families: number;
  operators: number;
  sponsors: number;
}

const COMMAND_ALIASES: Readonly<Record<string, SeedCliCommand>> = {
  auth: "admin",
  reset: "setup",
};

export function parseSeedCliArgs(args: readonly string[]): SeedCliOptions {
  const normalized = args.filter((argument) => argument !== "--");
  const help = normalized.includes("--help") || normalized.includes("-h");
  const yes = normalized.includes("--yes") || normalized.includes("-y");
  const commandIndex = normalized.findIndex(
    (argument) => !argument.startsWith("-"),
  );
  const rawCommand = commandIndex === -1 ? undefined : normalized[commandIndex];
  const command = rawCommand
    ? COMMAND_ALIASES[rawCommand] ??
      SEED_CLI_COMMANDS.find((candidate) => candidate === rawCommand)
    : undefined;

  if (rawCommand && !command) {
    throw new Error(
      `Unknown seed command '${rawCommand}'. Run 'bun run seed -- --help' for usage.`,
    );
  }

  const passthrough = normalized.filter(
    (argument, index) =>
      index !== commandIndex &&
      argument !== "--help" &&
      argument !== "-h" &&
      argument !== "--yes" &&
      argument !== "-y",
  );
  if (
    command &&
    command !== "demo" &&
    command !== "full" &&
    passthrough.length > 0
  ) {
    throw new Error(
      `Command '${command}' does not accept: ${passthrough.join(" ")}.`,
    );
  }

  return { command, help, passthrough, yes };
}

export function seedCountValidation(value: string | undefined) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0 || count > 10_000) {
    return "Enter a whole number between 0 and 10000.";
  }
}

export function demoCountArgs(counts: SeedCliDemoCounts) {
  return [
    `--families=${counts.families}`,
    `--sponsors=${counts.sponsors}`,
    `--operators=${counts.operators}`,
    `--contributions=${counts.contributions}`,
  ];
}

export function seedCliHelp() {
  return `Kafil seed CLI

Usage:
  bun run seed                         Open the interactive menu
  bun run seed -- <command> [options] Run a command directly

Commands:
  setup     Migrate, clear application data/storage, and seed auth
  demo      Seed demo families, sponsors, operators, and contributions
  full      Run setup followed by demo data
  migrate   Apply database migrations only
  admin     Repair the bootstrap admin, roles, and permissions
  verify    Verify the auth seed
  images    Validate and list family/sponsor seed image files

Demo/full options:
  -f, --families <count>        Default: 20
  -s, --sponsors <count>        Default: 50
  -o, --operators <count>       Default: 5
  -c, --contributions <count>   Default: 100

The interactive demo/full workflows prompt for all four counts before running.

Admin credentials:
  Interactive terminals prompt for the admin email, masked password, and
  masked password confirmation before starting the database-backed seed.
  Non-interactive runs use KAFIL_ADMIN_EMAIL/KAFIL_ADMIN_PASSWORD or the
  ADMIN_EMAIL/ADMIN_PASSWORD aliases.

Safety:
  admin repairs only the bootstrap admin and auth definitions; it does not
  migrate, clear application data, or seed demo data.
  setup and full clear application data. Add --yes for non-interactive use.
  Use --help or -h to print this help.`;
}
