import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { auth } from "../src/lib/auth";
import { loginWithIdentifier } from "../src/services/accessApi";

const spies: Array<{ mockRestore(): void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

describe("identifier login session selection", () => {
  test("uses Kafil login directly and returns a regular-session result", async () => {
    const post = spyOn(auth.api, "post").mockResolvedValue({
      data: { nextStep: "authenticated" },
      status: "success",
    } as never);
    spies.push(post);

    await expect(
      loginWithIdentifier({
        identifier: "ADMIN@gmail.com",
        password: "Password1",
        rememberMe: false,
      }),
    ).resolves.toEqual({ nextStep: "authenticated" });

    expect(post).toHaveBeenCalledWith("/access/login", {
      body: {
        identifier: "admin@gmail.com",
        password: "Password1",
        rememberMe: false,
      },
    });
  });

  test("returns the server-owned setup-only result without hydrating Najm auth", async () => {
    const post = spyOn(auth.api, "post").mockResolvedValue({
      data: {
        nextStep: "family_password_setup",
        expiresAt: "2026-08-01T12:10:00.000Z",
      },
      status: "success",
    } as never);
    const login = spyOn(auth.client, "login");
    spies.push(post, login);

    await expect(
      loginWithIdentifier({
        identifier: "06 12 34 56 78",
        password: "AB123456",
        rememberMe: true,
      }),
    ).resolves.toEqual({
      nextStep: "family_password_setup",
      expiresAt: "2026-08-01T12:10:00.000Z",
    });

    expect(post).toHaveBeenCalledWith("/access/login", {
      body: {
        identifier: "+212612345678",
        password: "ab123456",
        rememberMe: true,
      },
    });
    expect(login).not.toHaveBeenCalled();
  });

  test("normalizes uppercase and lowercase family CIN credentials identically", async () => {
    const post = spyOn(auth.api, "post").mockResolvedValue({
      data: { nextStep: "family_password_setup", expiresAt: "soon" },
      status: "success",
    } as never);
    spies.push(post);

    await loginWithIdentifier({
      identifier: "06 12 34 56 78",
      password: "AB123456",
      rememberMe: false,
    });
    await loginWithIdentifier({
      identifier: "06 12 34 56 78",
      password: "ab123456",
      rememberMe: true,
    });

    expect(post.mock.calls.map((call) => call[1])).toEqual([
      {
        body: {
          identifier: "+212612345678",
          password: "ab123456",
          rememberMe: false,
        },
      },
      {
        body: {
          identifier: "+212612345678",
          password: "ab123456",
          rememberMe: true,
        },
      },
    ]);
  });
});
