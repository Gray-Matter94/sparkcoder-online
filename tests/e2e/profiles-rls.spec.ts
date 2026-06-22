import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "";

function freshClient() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test.describe("profiles RLS — profiles_public_select", () => {
  test.skip(
    !SUPABASE_URL || !SUPABASE_KEY,
    "Supabase env vars not configured",
  );

  test("anonymous users cannot read any profile rows", async () => {
    const anon = freshClient();
    const { data, error } = await anon.from("profiles").select("id");
    // RLS hides rows — request succeeds but returns zero rows.
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  test("anonymous users cannot insert into profiles", async () => {
    const anon = freshClient();
    const { error } = await anon
      .from("profiles")
      .insert({ id: crypto.randomUUID(), display_name: "x" });
    expect(error).not.toBeNull();
  });

  test("authenticated user only sees their own profile, not other users'", async () => {
    const userA = freshClient();
    const userB = freshClient();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const emailA = `rls-a-${suffix}@example.com`;
    const emailB = `rls-b-${suffix}@example.com`;
    const password = `Test!${suffix}aA1`;

    const signUpA = await userA.auth.signUp({ email: emailA, password });
    const signUpB = await userB.auth.signUp({ email: emailB, password });

    test.skip(
      !signUpA.data.session || !signUpB.data.session,
      "Email confirmation is enabled — cannot obtain sessions in test",
    );

    expect(signUpA.error).toBeNull();
    expect(signUpB.error).toBeNull();

    const userAId = signUpA.data.user!.id;
    const userBId = signUpB.data.user!.id;

    // User A queries all profiles — should ONLY see their own row.
    const { data: aRows, error: aErr } = await userA
      .from("profiles")
      .select("id");
    expect(aErr).toBeNull();
    const aIds = (aRows ?? []).map((r) => r.id);
    expect(aIds).toContain(userAId);
    expect(aIds).not.toContain(userBId);

    // Directly target user B's row by id — must return zero rows for user A.
    const { data: targeted, error: targetedErr } = await userA
      .from("profiles")
      .select("id")
      .eq("id", userBId);
    expect(targetedErr).toBeNull();
    expect(targeted ?? []).toEqual([]);

    // User A cannot update user B's profile.
    const { data: updated } = await userA
      .from("profiles")
      .update({ display_name: "hacked" })
      .eq("id", userBId)
      .select();
    expect(updated ?? []).toEqual([]);
  });
});
