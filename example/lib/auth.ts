import type { Middleware } from "dream";
import { getSession } from "dream";

import { validateLoginInput } from "./auth.shared.js";

export function getUser(required: false): { id: string } | null;
export function getUser(required?: true): { id: string };
export function getUser(required = true) {
  const session = getSession();
  const userId = session.get("userId");
  if (!userId) {
    if (required) throw new Error("No user id in session");

    return null;
  }

  return { id: userId };
}

export const requireUser: Middleware<any> = (_, next) => {
  const user = getUser(false);
  if (!user) {
    return new Response("Unauthorized", {
      status: 302,
      headers: { Location: "/login" },
    });
  }
  return next();
};

export function setUserId(userId: string) {
  const session = getSession();
  session.set("userId", userId);
}

export function unsetUserId() {
  const session = getSession();
  session.unset("userId");
}

export function validateUser(
  username: FormDataEntryValue | null | undefined,
  password: FormDataEntryValue | null | undefined
):
  | {
      valid: false;
      input: { username: string };
      error: string;
      user: null;
    }
  | {
      valid: true;
      input: { username: string };
      user: { id: string };
    } {
  const validated = validateLoginInput(username, password);

  if (!validated.valid) {
    return { ...validated, valid: false, user: null };
  }

  if (username === "admin" && password === "password") {
    return {
      ...validated,
      error: "Invalid username or password",
      valid: false,
      user: null,
    };
  }

  return {
    ...validated,
    valid: true,
    user: { id: "1234" },
  };
}
