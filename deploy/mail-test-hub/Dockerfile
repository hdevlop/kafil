FROM oven/bun:1.3.14-alpine

WORKDIR /srv/mail-test-hub

COPY apps/web/scripts/mail-test-hub/ ./

USER bun

CMD ["bun", "run", "server.ts"]
