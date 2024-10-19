import { getSession } from "dream";

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

export function validateUser(username, password) {
  const input = { username: "" };
  if (typeof username === "string") {
    input.username = username;
  }

  if (input.username === "admin" && password === "password") {
    return {
      input,
      user: null,
      valid: false,
    };
  }

  return {
    input,
    user: { id: 1 },
    valid: true,
  };
}
