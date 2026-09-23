// Workspace dependency-boundary checker.
//
// Parses every workspace source file with the TypeScript compiler API,
// resolves each import the way the TypeScript program does (tsconfig paths,
// relative files, and workspace package `exports`), and enforces the policy in
// `workspace-boundaries.config.mjs`:
//
// - package direction: which workspace roles each role may depend on;
// - declared exports: a cross-package import names the package and one of its
//   exported subpaths, and the importing package declares the dependency;
// - contracts portability: only audited portable dependencies, no Node APIs;
// - browser graphs: every runtime path from a `"use client"` module, followed
//   transitively through workspace files, stays clear of server and seed
//   code, `server-only` modules, Node built-ins, server-only packages and
//   computed module loading.
//
// Type-only edges are erased before runtime. They still obey package
// direction, but are reported separately instead of failing a browser graph.
// Nothing is executed: files are read and parsed, never imported.
//
// The same file runs in School and Kafil; only the config differs.

import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { builtinModules } from "node:module";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const ASSET_EXTENSIONS = new Set([
  ".css", ".scss", ".sass", ".less", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif",
  ".ico", ".woff", ".woff2", ".ttf", ".otf", ".mp3", ".mp4", ".webm", ".txt", ".md",
]);
const NODE_BUILTINS = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const isRuntimeBuiltin = (specifier) => NODE_BUILTINS.has(specifier) || specifier.startsWith("bun:");
const isTestFile = (path) => /\.test\.[cm]?[jt]sx?$/.test(path) || /(^|[\\/])tests?[\\/]/.test(path);
const IGNORED_DIRECTORIES = new Set(["node_modules", ".next", "dist", ".turbo", "coverage"]);

const toPosix = (path) => path.split(sep).join("/");

function packageNameOf(specifier) {
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0];
}

function isBareSpecifier(specifier) {
  return !specifier.startsWith(".") && !specifier.startsWith("/") && !/^[a-zA-Z]:/.test(specifier);
}

function matchesSpecifier(specifier, patterns) {
  return patterns.some((pattern) => specifier === pattern || specifier.startsWith(`${pattern}/`));
}

function listSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...listSourceFiles(path));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) output.push(path);
  }
  return output;
}

/** Imports, re-exports, requires and dynamic imports of one parsed file. */
export function collectEdges(sourceFile) {
  const edges = [];
  const computed = [];
  let directive;
  let serverOnly = false;

  for (const statement of sourceFile.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    const text = statement.expression.text;
    if (text === "use client" || text === "use server") directive = text;
  }

  const add = (specifier, kind, typeOnly, node) => {
    if (specifier === "server-only" && !typeOnly) serverOnly = true;
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    edges.push({ specifier, kind, typeOnly, line: line + 1 });
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      let typeOnly = false;
      if (clause?.isTypeOnly) typeOnly = true;
      else if (clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
        const elements = clause.namedBindings.elements;
        typeOnly = elements.length > 0 && elements.every((element) => element.isTypeOnly);
      }
      add(node.moduleSpecifier.text, clause ? "import" : "side-effect import", typeOnly, node);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      let typeOnly = node.isTypeOnly;
      if (!typeOnly && node.exportClause && ts.isNamedExports(node.exportClause)) {
        const elements = node.exportClause.elements;
        typeOnly = elements.length > 0 && elements.every((element) => element.isTypeOnly);
      }
      add(node.moduleSpecifier.text, "re-export", typeOnly, node);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      add(node.moduleReference.expression.text, "import-equals", node.isTypeOnly, node);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      add(node.argument.literal.text, "import type", true, node);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) {
        const [argument] = node.arguments;
        const kind = isDynamicImport ? "dynamic import" : "require";
        if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
          add(argument.text, kind, false, node);
        } else {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
          computed.push({ kind, line: line + 1, text: node.getText(sourceFile).slice(0, 120) });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return { edges, computed, directive, serverOnly };
}

function scriptKindFor(path) {
  switch (extname(path)) {
    case ".tsx": return ts.ScriptKind.TSX;
    case ".jsx": return ts.ScriptKind.JSX;
    case ".js": case ".mjs": case ".cjs": return ts.ScriptKind.JS;
    default: return ts.ScriptKind.TS;
  }
}

const DEFAULT_COMPILER_OPTIONS = {
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
  allowJs: true,
  jsx: ts.JsxEmit.Preserve,
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * Check a workspace against a policy. Returns every violation, with the
 * import chain that produced it, plus the type-only coupling report.
 */
export function checkWorkspace({ root, policy }) {
  // Canonical casing matters on Windows: TypeScript's realpath returns the
  // on-disk drive letter, and every ownership test compares path prefixes.
  root = realpathSync.native(resolve(root));
  const violations = [];
  const typeCoupling = [];

  const packages = Object.entries(policy.packages).map(([name, entry]) => {
    const dir = resolve(root, entry.dir);
    const manifestPath = join(dir, "package.json");
    const manifest = existsSync(manifestPath) ? readJson(manifestPath) : {};
    if (manifest.name && manifest.name !== name) {
      violations.push({
        rule: "policy",
        file: toPosix(relative(root, manifestPath)),
        message: `policy names ${name} but the manifest declares ${manifest.name}`,
      });
    }
    const declared = new Set(Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
      ...manifest.optionalDependencies,
    }));
    return { name, role: entry.role, dir, sources: entry.sources ?? ["src"], manifest, declared };
  });
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  // A file under any node_modules segment is an installed package, even when
  // that node_modules directory sits inside a workspace (a nested install or
  // a test fixture's own dependencies).
  const ownerOf = (file) => {
    const normalized = resolve(file);
    const pkg = packages.find((entry) => normalized === entry.dir || normalized.startsWith(entry.dir + sep));
    if (!pkg || relative(pkg.dir, normalized).split(sep).includes("node_modules")) return undefined;
    return pkg;
  };
  const display = (file) => toPosix(relative(root, file));

  // Workspace packages resolve through root node_modules links in a real
  // checkout. Virtualize those links so a fixture without an install resolves
  // identically, through each package's own `exports`.
  const nodeModules = join(root, "node_modules");
  const scopes = new Set(packages.filter((pkg) => pkg.name.startsWith("@")).map((pkg) => pkg.name.split("/")[0]));
  const mapPath = (path) => {
    const absolute = resolve(path);
    for (const pkg of packages) {
      const link = join(nodeModules, ...pkg.name.split("/"));
      if (absolute === link) return pkg.dir;
      if (absolute.startsWith(link + sep)) return join(pkg.dir, absolute.slice(link.length + 1));
    }
    return absolute;
  };
  const host = {
    fileExists: (path) => ts.sys.fileExists(mapPath(path)),
    readFile: (path) => ts.sys.readFile(mapPath(path)),
    directoryExists: (path) => {
      const absolute = resolve(path);
      if (absolute === nodeModules) return true;
      if ([...scopes].some((scope) => absolute === join(nodeModules, scope))) return true;
      return ts.sys.directoryExists(mapPath(path));
    },
    realpath: (path) => {
      const mapped = mapPath(path);
      return ts.sys.realpath ? ts.sys.realpath(mapped) : mapped;
    },
    getCurrentDirectory: () => root,
    getDirectories: (path) => ts.sys.getDirectories(mapPath(path)),
  };

  const optionsByPackage = new Map();
  for (const pkg of packages) {
    const tsconfig = join(pkg.dir, "tsconfig.json");
    let options = { ...DEFAULT_COMPILER_OPTIONS };
    if (existsSync(tsconfig)) {
      const parsed = ts.getParsedCommandLineOfConfigFile(tsconfig, {}, {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        },
      });
      options = { ...DEFAULT_COMPILER_OPTIONS, ...parsed.options };
    }
    optionsByPackage.set(pkg, { options, cache: ts.createModuleResolutionCache(root, (name) => name, options) });
  }

  // Parse every file reachable from a workspace source root, including
  // workspace files outside the listed roots that an import pulls in.
  const files = new Map();
  const load = (file) => {
    const key = resolve(file);
    if (files.has(key)) return files.get(key);
    const text = readFileSync(key, "utf8");
    const sourceFile = ts.createSourceFile(key, text, ts.ScriptTarget.Latest, true, scriptKindFor(key));
    const info = { file: key, owner: ownerOf(key), ...collectEdges(sourceFile), resolved: [] };
    files.set(key, info);
    return info;
  };

  const resolveEdge = (info, edge) => {
    const pkg = info.owner;
    const { options, cache } = optionsByPackage.get(pkg) ?? { options: DEFAULT_COMPILER_OPTIONS };
    if (isRuntimeBuiltin(edge.specifier)) return { kind: "builtin" };
    const result = ts.resolveModuleName(edge.specifier, info.file, options, host, cache);
    const resolvedFile = result.resolvedModule?.resolvedFileName;
    if (resolvedFile) {
      const target = resolve(host.realpath(resolvedFile));
      const owner = ownerOf(target);
      if (owner) return { kind: "workspace", file: target, owner };
      if (toPosix(target).includes("/node_modules/")) return { kind: "external", name: packageNameOf(edge.specifier) };
      return { kind: "outside", file: target };
    }
    if (ASSET_EXTENSIONS.has(extname(edge.specifier))) return { kind: "asset" };
    if (isBareSpecifier(edge.specifier)) {
      const name = packageNameOf(edge.specifier);
      if (byName.has(name)) return { kind: "unexported", name };
      return { kind: "external", name };
    }
    return { kind: "unresolved" };
  };

  const queue = [];
  for (const pkg of packages) {
    for (const sourceRoot of pkg.sources) {
      for (const file of listSourceFiles(join(pkg.dir, sourceRoot))) queue.push(file);
    }
  }
  const scanned = new Set();
  while (queue.length) {
    const file = resolve(queue.pop());
    if (scanned.has(file)) continue;
    scanned.add(file);
    const info = load(file);
    if (!info.owner) continue;
    for (const edge of info.edges) {
      const target = resolveEdge(info, edge);
      info.resolved.push({ edge, target });
      if (target.kind === "workspace" && SOURCE_EXTENSIONS.has(extname(target.file)) && !scanned.has(target.file)) {
        queue.push(target.file);
      }
    }
  }

  const where = (info, edge) => `${display(info.file)}:${edge.line}`;

  // Per-file rules: package direction, declared exports, contracts portability.
  const allowedRoles = policy.allowedDependencies ?? {};
  const contractsPolicy = policy.contracts ?? {};
  for (const info of files.values()) {
    const pkg = info.owner;
    if (!pkg) continue;
    for (const { edge, target } of info.resolved) {
      const label = `${edge.kind} "${edge.specifier}"`;
      if (target.kind === "unresolved") {
        violations.push({ rule: "unresolved", file: where(info, edge), message: `${label} does not resolve; boundaries cannot be verified` });
        continue;
      }
      if (target.kind === "outside") {
        violations.push({ rule: "ownership", file: where(info, edge), message: `${label} reaches ${display(target.file)}, which no workspace package owns` });
        continue;
      }
      if (target.kind === "unexported") {
        violations.push({ rule: "exports", file: where(info, edge), message: `${label} is not an export of ${target.name}` });
        continue;
      }
      if (target.kind === "workspace" && target.owner !== pkg) {
        const allowed = allowedRoles[pkg.role] ?? [];
        if (!allowed.includes(target.owner.role)) {
          violations.push({
            rule: "direction",
            file: where(info, edge),
            message: `${pkg.role} package ${pkg.name} must not depend on ${target.owner.role} package ${target.owner.name} (${label})`,
          });
        }
        if (!isBareSpecifier(edge.specifier) || packageNameOf(edge.specifier) !== target.owner.name) {
          violations.push({
            rule: "exports",
            file: where(info, edge),
            message: `${label} reaches into ${target.owner.name} without its package exports; import "${target.owner.name}" or a declared subpath`,
          });
        } else if (!pkg.declared.has(target.owner.name)) {
          violations.push({
            rule: "exports",
            file: where(info, edge),
            message: `${pkg.name} imports ${target.owner.name} without declaring it as a dependency`,
          });
        }
      }
      const testRunner = isTestFile(relative(pkg.dir, info.file)) && matchesSpecifier(edge.specifier, contractsPolicy.allowedInTests ?? []);
      if (pkg.role === "contracts" && !testRunner) {
        if (target.kind === "builtin") {
          violations.push({ rule: "contracts", file: where(info, edge), message: `contracts must not use Node built-in ${edge.specifier}` });
        } else if (target.kind === "external" && !matchesSpecifier(edge.specifier, contractsPolicy.allowedExternal ?? [])) {
          violations.push({
            rule: "contracts",
            file: where(info, edge),
            message: `contracts may import only audited portable dependencies (${(contractsPolicy.allowedExternal ?? []).join(", ") || "none"}); found "${edge.specifier}"`,
          });
        }
      }
    }
    if (pkg.role === "contracts" && info.computed.length) {
      for (const load of info.computed) {
        violations.push({ rule: "contracts", file: `${display(info.file)}:${load.line}`, message: `contracts must not load modules by computed ${load.kind}: ${load.text}` });
      }
    }
  }

  // Contracts manifests may declare only allowlisted packages.
  for (const pkg of packages.filter((entry) => entry.role === "contracts")) {
    const allowedNames = new Set((contractsPolicy.allowedExternal ?? []).map(packageNameOf));
    for (const dependency of Object.keys(pkg.manifest.dependencies ?? {})) {
      if (!allowedNames.has(dependency)) {
        violations.push({
          rule: "contracts",
          file: display(join(pkg.dir, "package.json")),
          message: `contracts declares dependency ${dependency}, which is not in the audited portable list`,
        });
      }
    }
  }

  // Browser graphs: every runtime path from a "use client" module.
  const browser = policy.browser ?? {};
  const browserRoles = new Set(browser.entryRoles ?? ["app"]);
  const forbiddenRoles = new Set(browser.forbiddenRoles ?? ["server", "seed"]);
  const forbiddenExternal = browser.forbiddenExternal ?? [];
  const forbiddenSpecifiers = browser.forbiddenSpecifiers ?? [];
  const auditedExternal = browser.allowedExternal ?? [];
  const entries = [...files.values()].filter((info) => info.owner && browserRoles.has(info.owner.role) && info.directive === "use client");
  const reported = new Set();
  const browserExternals = new Set();
  const report = (rule, chain, message) => {
    const key = `${rule}|${chain.at(-1)}|${message}`;
    if (reported.has(key)) return;
    reported.add(key);
    violations.push({ rule, file: chain[0], chain, message });
  };

  for (const entry of entries) {
    const seen = new Set([entry.file]);
    const stack = [{ info: entry, chain: [display(entry.file)] }];
    while (stack.length) {
      const { info, chain } = stack.pop();
      for (const load of info.computed) {
        report("browser", chain, `computed ${load.kind} at line ${load.line} cannot be verified: ${load.text}`);
      }
      for (const { edge, target } of info.resolved) {
        if (edge.typeOnly) {
          if (target.kind === "workspace" && forbiddenRoles.has(target.owner.role)) {
            const key = `type|${display(info.file)}|${edge.specifier}`;
            if (!reported.has(key)) {
              reported.add(key);
              typeCoupling.push({ file: where(info, edge), specifier: edge.specifier, target: target.owner.name });
            }
          }
          continue;
        }
        const step = `${display(info.file)}:${edge.line} -> ${edge.specifier}`;
        const nextChain = [...chain.slice(0, -1), step];
        if (target.kind === "builtin") {
          report("browser", nextChain, `browser code reaches Node built-in ${edge.specifier}`);
        } else if (matchesSpecifier(edge.specifier, forbiddenSpecifiers)) {
          report("browser", nextChain, `browser code reaches ${edge.specifier}, which is server-only by policy`);
        } else if (
          target.kind === "external" &&
          matchesSpecifier(edge.specifier, forbiddenExternal) &&
          !matchesSpecifier(edge.specifier, auditedExternal)
        ) {
          report("browser", nextChain, `browser code reaches server-only package ${edge.specifier}`);
        } else if (target.kind === "external") {
          browserExternals.add(edge.specifier);
        } else if (target.kind === "workspace") {
          if (forbiddenRoles.has(target.owner.role)) {
            report("browser", nextChain, `browser code reaches ${target.owner.role} package ${target.owner.name} (${display(target.file)})`);
            continue;
          }
          const next = files.get(target.file);
          if (!next || seen.has(next.file)) continue;
          if (next.directive === "use server") continue;
          if (next.serverOnly) {
            report("browser", [...nextChain, display(next.file)], `browser code reaches a server-only module (imports "server-only")`);
            continue;
          }
          seen.add(next.file);
          stack.push({ info: next, chain: [...nextChain, display(next.file)] });
        }
      }
    }
  }

  return {
    violations,
    typeCoupling,
    stats: { files: files.size, clientEntries: entries.length, browserExternals: [...browserExternals].sort() },
  };
}

export function formatReport({ violations, typeCoupling, stats }) {
  const lines = [];
  if (violations.length) {
    lines.push(`Workspace boundary violations (${violations.length}):`);
    for (const violation of violations) {
      lines.push(`- [${violation.rule}] ${violation.message}`);
      if (violation.chain) {
        lines.push(...violation.chain.map((step) => `    ${step}`));
      } else {
        lines.push(`    at ${violation.file}`);
      }
    }
  }
  if (typeCoupling.length) {
    lines.push(`Type-only coupling from browser graphs to server or seed packages (erased at runtime; move shared DTOs to contracts):`);
    for (const item of typeCoupling) lines.push(`- ${item.file} -> ${item.specifier}`);
  }
  if (!violations.length) {
    lines.push(`Workspace boundaries passed: ${stats.files} files, ${stats.clientEntries} "use client" entries checked.`);
  }
  return lines.join("\n");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const root = resolve(scriptDir, "..");
  const { default: policy } = await import(pathToFileURL(join(scriptDir, "workspace-boundaries.config.mjs")).href);
  const result = checkWorkspace({ root, policy });
  const output = formatReport(result);
  if (process.argv.includes("--list-browser-externals")) {
    const listed = result.stats.browserExternals.map((name) => `- ${name}`);
    console.log(["Packages reached by browser graphs:", ...listed].join("\n"));
  }
  if (result.violations.length) {
    console.error(output);
    process.exit(1);
  }
  console.log(output);
}

