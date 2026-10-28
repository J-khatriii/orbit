import { describe, expect, it, vi } from "vitest";
import { sendEmail } from "../src/lib/mailer.js";
import { api, newAgent, signupAs, tokenFromEmail } from "./helpers.js";

const AUTH = "/api/v1/auth";

describe("health", () => {
  it("answers on the versioned path", async () => {
    const res = await api().get("/api/v1/health");

    expect(res.status).toBe(200);
  });
});

describe("signup", () => {
  it("creates the account, workspace and owner membership, and signs the user in", async () => {
    const { agent, res } = await signupAs({
      name: "Ana Rivera",
      workspaceName: "Ana Rivera Studio",
    });

    expect(res.status).toBe(201);
    expect(res.body.workspaces).toHaveLength(1);
    expect(res.body.workspaces[0]).toMatchObject({ slug: "ana-rivera-studio", role: "owner" });
    expect(res.headers["set-cookie"][0]).toMatch(/orbit_session=.+HttpOnly/);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    const me = await agent.get(`${AUTH}/me`);

    expect(me.status).toBe(200);
    expect(me.body.user.emailVerified).toBe(false);
  });

  it("rejects a duplicate email, ignoring letter case", async () => {
    await signupAs({ email: "dup@example.com" });
    const { res } = await signupAs({ email: "DUP@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("EMAIL_TAKEN");
  });

  it("rejects a short password with a field message", async () => {
    const res = await api()
      .post(`${AUTH}/signup`)
      .send({ name: "A", email: "a@example.com", password: "short", workspaceName: "Studio" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.fields.password).toBeTruthy();
  });

  it("gives two workspaces with the same name different addresses", async () => {
    const first = await signupAs({ workspaceName: "Same Name" });
    const second = await signupAs({ workspaceName: "Same Name" });

    expect(first.res.body.workspaces[0].slug).toBe("same-name");
    expect(second.res.body.workspaces[0].slug).toMatch(/^same-name-[0-9a-f]{6}$/);
  });
});

describe("login and sessions", () => {
  it("rejects a wrong password and an unknown email with the same message", async () => {
    const { email } = await signupAs();
    const wrong = await api().post(`${AUTH}/login`).send({ email, password: "not-the-password" });
    const unknown = await api()
      .post(`${AUTH}/login`)
      .send({ email: "nobody@example.com", password: "not-the-password" });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });

  it("signs in with the right credentials", async () => {
    const { email, password } = await signupAs();
    const agent = newAgent();
    const res = await agent.post(`${AUTH}/login`).send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.workspaces[0].role).toBe("owner");
    expect((await agent.get(`${AUTH}/me`)).status).toBe(200);
  });

  it("ends the session on logout", async () => {
    const { agent } = await signupAs();

    expect((await agent.get(`${AUTH}/me`)).status).toBe(200);
    expect((await agent.post(`${AUTH}/logout`)).status).toBe(204);
    expect((await agent.get(`${AUTH}/me`)).status).toBe(401);
  });

  it("requires a session for /me", async () => {
    const res = await api().get(`${AUTH}/me`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("email verification", () => {
  it("verifies the email, and the link works only once", async () => {
    const { agent } = await signupAs();
    const token = tokenFromEmail("Confirm your email");

    expect(token).toBeTruthy();

    const ok = await api().post(`${AUTH}/verify-email`).send({ token });

    expect(ok.status).toBe(200);
    expect((await agent.get(`${AUTH}/me`)).body.user.emailVerified).toBe(true);

    const again = await api().post(`${AUTH}/verify-email`).send({ token });

    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe("INVALID_TOKEN");
  });

  it("replaces the old link when a new one is requested", async () => {
    const { agent } = await signupAs();
    const first = tokenFromEmail("Confirm your email");

    expect((await agent.post(`${AUTH}/resend-verification`)).status).toBe(204);

    const second = tokenFromEmail("Confirm your email");

    expect(second).not.toBe(first);
    expect((await api().post(`${AUTH}/verify-email`).send({ token: first })).status).toBe(400);
    expect((await api().post(`${AUTH}/verify-email`).send({ token: second })).status).toBe(200);
  });
});

describe("password reset", () => {
  it("answers an unknown email exactly like a known one, and sends nothing", async () => {
    const res = await api().post(`${AUTH}/forgot-password`).send({ email: "nobody@example.com" });

    expect(res.status).toBe(202);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("resets the password, signs out every device, and the link works once", async () => {
    const { agent, email, password } = await signupAs();
    const newPassword = "a-brand-new-password";

    const forgot = await api().post(`${AUTH}/forgot-password`).send({ email });

    expect(forgot.status).toBe(202);

    // The reset email is sent in the background, so wait for it to appear.
    await vi.waitFor(() => {
      expect(tokenFromEmail("Reset your Orbit password")).toBeTruthy();
    });

    const token = tokenFromEmail("Reset your Orbit password");
    const weak = await api().post(`${AUTH}/reset-password`).send({ token, password: "short" });

    expect(weak.status).toBe(400);

    const reset = await api().post(`${AUTH}/reset-password`).send({ token, password: newPassword });

    expect(reset.status).toBe(204);
    expect((await agent.get(`${AUTH}/me`)).status).toBe(401);
    expect((await api().post(`${AUTH}/login`).send({ email, password })).status).toBe(401);
    expect((await api().post(`${AUTH}/login`).send({ email, password: newPassword })).status).toBe(
      200,
    );

    const reused = await api()
      .post(`${AUTH}/reset-password`)
      .send({ token, password: newPassword });

    expect(reused.status).toBe(400);
  });
});
