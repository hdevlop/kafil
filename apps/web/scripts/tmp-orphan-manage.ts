import { pool } from "@kafil/server/database";

const mode = process.argv[2] ?? "list";
try {
  if (mode === "list") {
    const rows = await pool.query(
      "select f.id, u.email from family_profiles f join users u on u.id = f.user_id where u.email like 'family-edit-%'",
    );
    console.log(`orphan_count=${rows.rows.length}`);
    for (const row of rows.rows as Array<{ id: string; email: string }>) {
      console.log(`orphan_id=${row.id}`);
    }
  } else if (mode === "delete") {
    const id = process.argv[3];
    if (!id) throw new Error("delete mode requires an id argument");
    const baseUrl = "http://127.0.0.1:3000";
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      body: JSON.stringify({
        identifier: process.env.KAFIL_ADMIN_EMAIL,
        password: process.env.KAFIL_ADMIN_PASSWORD,
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (!loginRes.ok) throw new Error(`admin login failed: ${loginRes.status}`);
    const loginBody = (await loginRes.json()) as {
      data?: { accessToken?: string; access_token?: string };
      accessToken?: string;
      access_token?: string;
    };
    const accessToken =
      loginBody.accessToken ??
      loginBody.access_token ??
      loginBody.data?.accessToken ??
      loginBody.data?.access_token ??
      "";
    if (!accessToken) throw new Error("no access token");
    const delRes = await fetch(`${baseUrl}/api/families/${id}`, {
      headers: { authorization: `Bearer ${accessToken}` },
      method: "DELETE",
    });
    console.log(`delete_status=${delRes.status}`);
    if (!delRes.ok) throw new Error("orphan delete failed");
    console.log("orphan_deleted=true");
  }
} finally {
  await pool.end();
}
