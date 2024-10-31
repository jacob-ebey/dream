/**
 * @type {import('./environment.js').environment}
 */
export function environment() {
	const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;
	if (!DB_CONNECTION_STRING) {
		throw new Error("Missing DB_CONNECTION_STRING environment variable");
	}

	return {
		DB_CONNECTION_STRING,
	};
}
