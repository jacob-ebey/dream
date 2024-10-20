import { getSession } from "dream";

import { validateLoginInput } from "./auth.shared.js";

export function getUser() {
  const session = getSession();
  const userId = session.get("userId");
  if (!userId) {
    return null;
  }

  return { id: userId };
}

export function requireUser() {
  const session = getSession();
  const userId = session.get("userId");
  if (!userId) {
    throw new Response("", {
      status: 303,
      headers: { Location: "/login" },
    });
  }

  return { id: userId };
}

export function setUserId(id) {
  const session = getSession();
  session.set("userId", userId);
}

export function unsetUserId() {
  const session = getSession();
  session.unset("userId");
}

export function validateUser(username, password) {
  const validated = validateLoginInput(username, password);

  if (!validated.valid) {
    return { ...validated, user: null };
  }

  if (input.username === "admin" && password === "password") {
    return {
      ...validated,
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
