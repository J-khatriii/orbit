import request from "supertest";
import app from "../src/app.js";
import { sendEmail } from "../src/lib/mailer.js";

export const PASSWORD = "correct-horse-battery";

let counter = 0;

// A plain client with no cookies.
export const api = () => {
  return request(app);
};

// A client that remembers cookies between calls, like a browser.
export const newAgent = () => {
  return request.agent(app);
};

// Creates a real account through the API. Returns the signed-in agent too.
export const signupAs = async ({
  name = "Test User",
  email,
  workspaceName = "Test Workspace",
} = {}) => {
  counter += 1;
  const agent = newAgent();
  const finalEmail = email ?? `user${counter}@example.com`;
  const res = await agent
    .post("/api/v1/auth/signup")
    .send({ name, email: finalEmail, password: PASSWORD, workspaceName });

  return { agent, res, email: finalEmail, password: PASSWORD };
};

// Finds the newest "sent" email whose subject contains the text, and returns its token.
export const tokenFromEmail = (subjectPart) => {
  const messages = sendEmail.mock.calls.map(([message]) => {
    return message;
  });
  const match = messages.findLast((message) => {
    return message.subject.includes(subjectPart);
  });

  return match?.text.match(/token=([\w-]+)/)?.[1];
};
