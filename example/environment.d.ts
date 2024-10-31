import "dream";
import type { Environment } from "dream";

declare module "dream" {
	export interface Environment {
		DB_CONNECTION_STRING: string;
	}
}

export declare function environment(): Environment;
