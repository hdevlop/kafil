export const SEED_CLI_COMMANDS = [
  "setup",
  "demo",
  "remove",
  "full",
  "migrate",
  "admin",
  "categories",
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
  clean: "remove",
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
  bun run seed
  bun run seed -- <command> [options]

Commands:
  full       Reset and seed everything
  demo       Add or repair demo data
  remove     Remove managed demo data and reset catalog
  setup      Reset app data and seed auth
  migrate    Apply migrations
  admin      Repair admin access
  categories Seed catalog categories
  verify     Verify auth seed
  images     Check seed images

Demo/full options:
  -f, --families <count>       Default: 20
  -s, --sponsors <count>      Default: 50
  -o, --operators <count>     Default: 5
  -c, --contributions <count> Default: 100

Safety:
  remove deletes managed demo data plus products and empty categories.
  setup/full delete all app data.
  Destructive non-interactive commands require --yes.`;
}
