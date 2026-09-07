import Redis from "ioredis";
import { Service } from "najm-core";

import {
  NOTIFICATION_WORKER_BATCH,
  NOTIFICATION_WORKER_IDLE_MS,
  notificationFlags,
} from "./notificationConfig";
import { NotificationDispatcher } from "./notificationDispatcher";
import { NotificationRepository } from "./notificationRepository";

/**
 * Redis logical key (without the `kafil:` keyPrefix applied by the client
 * below). The stored key is `kafil:notifications:worker:heartbeat`, which is
 * exactly what the Compose healthcheck reads without a prefix. Keep both in
 * sync: the healthcheck verifies presence only, never secrets or payloads.
 */
const HEARTBEAT_KEY = "notifications:worker:heartbeat";
const HEARTBEAT_TTL_SECONDS = 30;
const HEARTBEAT_INTERVAL_MS = 10_000;

@Service()
export class NotificationWorker {
  private stopped = false;
  private redis: Redis | null = null;

  constructor(
    private readonly notifications: NotificationRepository,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  stop() {
    this.stopped = true;
  }

  private heartbeat() {
    const url = process.env.REDIS_URL?.trim();
    if (!url) return null;
    if (!this.redis) {
      this.redis = new Redis(url, {
        keyPrefix: "kafil:",
        lazyConnect: true,
        maxRetriesPerRequest: 2,
      });
      this.redis.on("error", () => undefined);
    }
    return this.redis;
  }

  private async beat() {
    const client = this.heartbeat();
    if (!client) return;
    try {
      // Presence-only heartbeat: no secrets or payload values.
      await client.set(HEARTBEAT_KEY, String(Date.now()), "EX", HEARTBEAT_TTL_SECONDS);
    } catch {
      // A delivery outage must not crash the worker loop.
    }
  }

  async dispatchOnce() {
    let work = 0;
    if (notificationFlags.dispatchEnabled) {
      const jobs = await this.notifications.claimConsumerJobs(
        NOTIFICATION_WORKER_BATCH,
      );
      for (const job of jobs) {
        work += 1;
        try {
          await this.dispatcher.dispatchConsumerJob(job);
        } catch {
          await this.notifications.markConsumerFailed(
            job.id,
            "dispatch_error",
            new Date(),
          );
        }
      }
    }
    const deliveries = await this.notifications.claimDeliveries(
      NOTIFICATION_WORKER_BATCH,
    );
    for (const delivery of deliveries) {
      work += 1;
      try {
        await this.dispatcher.dispatchDeliveryJob(delivery);
      } catch {
        await this.notifications.markDeliveryFailed(
          delivery.id,
          "delivery_error",
          new Date(),
        );
      }
    }
    await this.beat();
    return work;
  }

  async run() {
    const onTerm = () => {
      this.stopped = true;
    };
    process.once("SIGTERM", onTerm);
    process.once("SIGINT", onTerm);
    // Keep liveness independent from provider latency. A delivery batch can
    // legitimately take longer than the heartbeat TTL, so updating only after
    // dispatchOnce() would make a live worker appear unhealthy under load.
    await this.beat();
    const heartbeatTimer = setInterval(() => {
      void this.beat();
    }, HEARTBEAT_INTERVAL_MS);
    try {
      while (!this.stopped) {
        const work = await this.dispatchOnce();
        if (work === 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, NOTIFICATION_WORKER_IDLE_MS),
          );
        }
      }
    } finally {
      clearInterval(heartbeatTimer);
      process.off("SIGTERM", onTerm);
      process.off("SIGINT", onTerm);
      try {
        await this.redis?.quit();
      } catch {
        // ignore
      }
      this.redis = null;
    }
  }
}
