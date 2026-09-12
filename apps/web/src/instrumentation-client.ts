type ZodConfiguredGlobal = typeof globalThis & {
  __zod_globalConfig?: {
    jitless?: boolean;
  };
};

const configuredGlobal = globalThis as ZodConfiguredGlobal;
configuredGlobal.__zod_globalConfig ??= {};
configuredGlobal.__zod_globalConfig.jitless = true;
