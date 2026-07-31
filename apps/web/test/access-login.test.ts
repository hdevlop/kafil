import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { auth } from "../src/lib/auth";
import { loginWithIdentifier } from "../src/services/accessApi";

const spies: Array<{ mockRestore(): void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

describe("identifier login session recovery", () => {
  test("uses Najm client login so a successful login resets an open refresh circuit", async () => {
    const login = spyOn(auth.client, "login").mockResolvedValue({
      id: "operator-user",
      email: "admin@gmail.com",
      role: "operator",
    } as never);
    const hasRole = spyOn(auth.client, "hasRole").mockReturnValue(false);
    spies.push(login, hasRole);

    await expect(
      loginWithIdentifier({
        identifier: "admin@gmail.com",
        password: "Password1",
      }),
    ).resolves.toEqual({ mustChangePassword: false });

    expect(login).toHaveBeenCalledWith({
      identifier: "admin@gmail.com",
      password: "Password1",
    });
  });

  test("loads the server-owned first-password requirement after a family login", async () => {
    const login = spyOn(auth.client, "login").mockResolvedValue({
      id: "family-user",
      email: "family@example.com",
      role: "family",
    } as never);
    const hasRole = spyOn(auth.client, "hasRole").mockReturnValue(true);
    const get = spyOn(auth.api, "get").mockResolvedValue({
      data: { mustChangePassword: true },
      status: "success",
    } as never);
    spies.push(login, hasRole, get);

    await expect(
      loginWithIdentifier({
        identifier: "06 12 34 56 78",
        password: "Amrani1987",
      }),
    ).resolves.toEqual({ mustChangePassword: true });

    expect(login).toHaveBeenCalledWith({
      identifier: "+212612345678",
      password: "Amrani1987",
    });
    expect(get).toHaveBeenCalledWith("/access/family-password/requirement");
  });
});
