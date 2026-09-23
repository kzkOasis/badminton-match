import { describe, expect, it } from "vitest";
import { adminClient, anonClient, createUser, dbUrl, errorOf, userClient } from "./helpers";

describe.skipIf(!dbUrl)("profiles の RLS", () => {
  it("本人だけが自分のプロフィールを作成・更新できる", async () => {
    const admin = await adminClient();
    const me = await createUser(admin, { withProfile: false });
    const other = await createUser(admin, { name: "他人" });
    const client = await userClient(me);

    await client.query(
      "insert into public.profiles (id, display_name, level) values ($1, 'わたし', 'beginner')",
      [me],
    );

    // 他人のプロフィールは作れない・書き換えられない
    expect(
      await errorOf(
        client.query(
          "insert into public.profiles (id, display_name, level) values (gen_random_uuid(), 'なりすまし', 'beginner')",
        ),
      ),
    ).toMatch(/row-level security/);
    const res = await client.query("update public.profiles set display_name = '改ざん' where id = $1", [
      other,
    ]);
    expect(res.rowCount).toBe(0);

    const { rows } = await admin.query("select display_name from public.profiles where id = $1", [other]);
    expect(rows[0].display_name).toBe("他人");
  });

  it("ログインユーザーは他人のプロフィールを読めるが、未ログインでは読めない", async () => {
    const admin = await adminClient();
    const me = await createUser(admin);
    const other = await createUser(admin, { name: "読まれる人" });

    const client = await userClient(me);
    const { rows } = await client.query("select display_name from public.profiles where id = $1", [other]);
    expect(rows).toEqual([{ display_name: "読まれる人" }]);

    const anon = await anonClient();
    expect(await errorOf(anon.query("select * from public.profiles"))).toMatch(/permission denied/);
  });

  it("レベルは決められた値しか入らない", async () => {
    const admin = await adminClient();
    const me = await createUser(admin, { withProfile: false });
    const client = await userClient(me);
    expect(
      await errorOf(
        client.query("insert into public.profiles (id, display_name, level) values ($1, 'x', 'pro')", [me]),
      ),
    ).toMatch(/check constraint/);
  });
});
