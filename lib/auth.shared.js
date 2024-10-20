export function validateLoginInput(username, password) {
  const input = { username: "" };
  if (typeof username === "string") {
    input.username = username;
  }

  if (typeof username !== "string" || typeof password !== "string") {
    return {
      valid: false,
      input,
      error: "Invalid input",
    };
  }

  if (username === "" || password === "") {
    return {
      valid: false,
      input,
      error: "Username and password are required",
    };
  }

  return {
    valid: true,
    input,
  };
}
