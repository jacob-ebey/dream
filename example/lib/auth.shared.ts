export function validateLoginInput(
	username: FormDataEntryValue | null | undefined,
	password: FormDataEntryValue | null | undefined,
):
	| {
			valid: false;
			input: { username: string };
			error: string;
	  }
	| {
			valid: true;
			input: { username: string };
	  } {
	const input = { username: "" };
	if (typeof username === "string") {
		username = username.trim();
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
