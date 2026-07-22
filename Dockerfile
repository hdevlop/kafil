# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3.14 AS dependencies
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/seed/package.json packages/seed/package.json
RUN bun install --frozen-lockfile

FROM oven/bun:1.3.14 AS build
WORKDIR /app

ARG NEXT_PUBLIC_FORM_FILL_ENABLED=false
ARG OCI_CREATED
ARG OCI_REVISION
ENV NEXT_PUBLIC_FORM_FILL_ENABLED=${NEXT_PUBLIC_FORM_FILL_ENABLED}

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=dependencies /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=dependencies /app/packages/seed/node_modules ./packages/seed/node_modules
COPY . .
RUN test "${NEXT_PUBLIC_FORM_FILL_ENABLED}" = "false"
RUN EMAIL_PROVIDER=console \
    EMAIL_DEFAULT_FROM=no-reply@example.invalid \
    FRONTEND_URL=https://demo.example.invalid \
    JWT_ACCESS_SECRET=build-only-access-secret-at-least-32-characters \
    JWT_REFRESH_SECRET=build-only-refresh-secret-at-least-32-characters \
    NAJM_ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000 \
    bun run build

FROM oven/bun:1.3.14 AS runtime
WORKDIR /app

ARG OCI_CREATED
ARG OCI_REVISION
LABEL org.opencontainers.image.created=${OCI_CREATED} \
      org.opencontainers.image.revision=${OCI_REVISION} \
      org.opencontainers.image.source="https://github.com/hdevlop/kafil"

ENV HOSTNAME=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000

COPY --from=build --chown=bun:bun /app/package.json /app/bun.lock ./
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/apps/web/package.json /app/apps/web/next.config.ts ./apps/web/
COPY --from=build --chown=bun:bun /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=bun:bun /app/apps/web/public ./apps/web/public
COPY --from=build --chown=bun:bun /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build --chown=bun:bun /app/packages/server ./packages/server
COPY --from=build --chown=bun:bun /app/packages/seed ./packages/seed

USER bun
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=4 \
  CMD ["bun", "-e", "const r=await fetch('http://127.0.0.1:3000/api/system/readiness');process.exit(r.ok?0:1)"]
CMD ["bun", "run", "start"]
