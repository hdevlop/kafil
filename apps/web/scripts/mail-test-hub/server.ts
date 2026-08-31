import {
  createMailTestGateway,
  parseMailTestGatewayConfig,
} from "./gateway";

const port = Number(Bun.env.MAIL_TEST_GATEWAY_PORT ?? "8080");
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("MAIL_TEST_GATEWAY_PORT must be a valid TCP port.");
}

const gateway = createMailTestGateway(parseMailTestGatewayConfig(Bun.env));

Bun.serve({
  hostname: "0.0.0.0",
  port,
  maxRequestBodySize: 16_384,
  fetch: gateway,
});

console.log("Mail test gateway ready.");
