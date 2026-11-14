import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSession } from "@/auth/session";
import { SESSION_COOKIE } from "@/auth/cookie";
import type { Db } from "@/db/client";
import { eq } from "drizzle-orm";
import { media, profile } from "@/db/schema";
import { toFormValues } from "@/admin/fields";
import { PROFILE_FIELDS } from "@/admin/resources";
import { seededDb, testDb } from "./helpers";

const state = vi.hoisted(() => ({
  headers: {} as Record<string, string>,
  cookies: {} as Record<string, string>,
  set: undefined as unknown as ReturnType<typeof vi.fn>,
  db: undefined as unknown as Db,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.headers),
  cookies: async () => ({
    get: (name: string) => (name in state.cookies ? { name, value: state.cookies[name] } : undefined),
    set: state.set,
    delete: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/db/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/db/client")>()), getDb: () => state.db }));

const { assertAdminAction } = await import("@/auth/admin");
const { saveProfileAction } = await import("@/admin/actions");

const DAY = 86_400_000;
const OWNER = "owner@example.com";
const goodHeaders = { "tailscale-user-login": OWNER, origin: "https://box.tail.ts.net:8443", host: "box.tail.ts.net:8443" };
const env = { ...process.env };

beforeEach(() => {
  process.env.ROLE = "admin";
  process.env.ADMIN_TAILSCALE_LOGIN = OWNER;
  vi.stubEnv("NODE_ENV", "production");
  state.db = testDb();
  state.headers = { ...goodHeaders };
  state.cookies = {};
  state.set = vi.fn();
});
afterEach(() => {
  process.env = { ...env };
  vi.unstubAllEnvs();
});

describe("assertAdminAction", () => {
  it("throws in the public role, whatever else is right", async () => {
    process.env.ROLE = "public";
    await expect(assertAdminAction()).rejects.toThrow("Not found");
    delete process.env.ROLE;
    await expect(assertAdminAction()).rejects.toThrow("Not found");
  });

  it("throws without the owner's tailnet identity", async () => {
    delete state.headers["tailscale-user-login"];
    await expect(assertAdminAction()).rejects.toThrow("Not found");
    state.headers["tailscale-user-login"] = "someone@else.com";
    await expect(assertAdminAction()).rejects.toThrow("Not found");
    state.headers["tailscale-user-login"] = OWNER;
    delete process.env.ADMIN_TAILSCALE_LOGIN;
    await expect(assertAdminAction()).rejects.toThrow("Not found");
  });

  it("refuses a missing or foreign Origin", async () => {
    delete state.headers.origin;
    await expect(assertAdminAction()).rejects.toThrow("cross-origin");
    state.headers.origin = "https://evil.example";
    await expect(assertAdminAction()).rejects.toThrow("cross-origin");
    state.headers.origin = "https://box.tail.ts.net"; // same host, port dropped: not the same origin
    await expect(assertAdminAction()).rejects.toThrow("cross-origin");
  });

  it("prefers x-forwarded-host over host when comparing the Origin", async () => {
    state.headers.host = "127.0.0.1:3101";
    state.headers["x-forwarded-host"] = "box.tail.ts.net:8443";
    await expect(assertAdminAction({ needSession: false })).resolves.toBeUndefined();
  });

  it("redirects to sign-in without a session cookie or with an unknown token", async () => {
    await expect(assertAdminAction()).rejects.toThrow("REDIRECT:/admin/login");
    state.cookies[SESSION_COOKIE] = "not-a-real-token";
    await expect(assertAdminAction()).rejects.toThrow("REDIRECT:/admin/login");
  });

  it("lets sign-in and setup through without a session", async () => {
    await expect(assertAdminAction({ needSession: false })).resolves.toBeUndefined();
  });

  it("passes with a valid session and leaves the cookie alone", async () => {
    const { token } = createSession(state.db, "test", new Date());
    state.cookies[SESSION_COOKIE] = token;
    await expect(assertAdminAction()).resolves.toBeUndefined();
    expect(state.set).not.toHaveBeenCalled();
  });

  it("re-sets the cookie when the session is renewed", async () => {
    const { token } = createSession(state.db, "test", new Date(Date.now() - 2 * DAY)); // 12 days left
    state.cookies[SESSION_COOKIE] = token;
    const before = Date.now();
    await expect(assertAdminAction()).resolves.toBeUndefined();
    expect(state.set).toHaveBeenCalledTimes(1);
    const [name, value, options] = state.set.mock.calls[0];
    expect(name).toBe(SESSION_COOKIE);
    expect(value).toBe(token);
    expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: "strict", path: "/" });
    expect(options.expires.getTime()).toBeGreaterThan(before + 13 * DAY);
  });
});

describe("saveProfileAction", () => {
  function profileForm(over: Record<string, string>): FormData {
    const row = state.db.select().from(profile).get()!;
    const values = { ...toFormValues(PROFILE_FIELDS, row as Record<string, unknown>), ...over };
    const form = new FormData();
    for (const [k, v] of Object.entries(values)) form.set(k, v);
    return form;
  }
  const mediaId = (kind: "photo" | "screenshot") => state.db.select().from(media).where(eq(media.kind, kind)).get()!.id;
  const prev = { status: "idle" as const, errors: {} };

  beforeEach(() => {
    state.db = seededDb();
    state.cookies[SESSION_COOKIE] = createSession(state.db, "test", new Date()).token;
  });

  it("returns a field error, and saves nothing, for a deleted or wrong-kind image", async () => {
    const before = state.db.select().from(profile).get()!;
    const msg = "Pick a photo from the media library.";
    const gone = await saveProfileAction(prev, profileForm({ photoId: "99999", firstName: "Changed" }));
    expect(gone).toMatchObject({ status: "error", errors: { photoId: msg } });
    expect(gone.values?.firstName).toBe("Changed");
    const wrong = await saveProfileAction(prev, profileForm({ cvPhotoId: String(mediaId("screenshot")) }));
    expect(wrong).toMatchObject({ status: "error", errors: { cvPhotoId: msg } });
    expect(state.db.select().from(profile).get()).toEqual(before);
  });

  it("saves empty pickers and right-kind images", async () => {
    const save = saveProfileAction;
    expect((await save(prev, profileForm({ photoId: "", cvPhotoId: "" }))).status).toBe("saved");
    expect(state.db.select().from(profile).get()).toMatchObject({ photoId: null, cvPhotoId: null });
    const photo = mediaId("photo");
    expect((await save(prev, profileForm({ photoId: String(photo), cvPhotoId: String(photo) }))).status).toBe("saved");
    expect(state.db.select().from(profile).get()).toMatchObject({ photoId: photo, cvPhotoId: photo });
  });
});
