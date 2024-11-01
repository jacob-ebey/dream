import type { JSX } from "dream/jsx";

import { cn } from "~/lib/utils.js";

const Card = (props: JSX.IntrinsicElements["div"]) => (
	<div
		{...props}
		class={cn(
			"rounded-xl border bg-card text-card-foreground shadow",
			props.class,
		)}
	/>
);

const CardHeader = (props: JSX.IntrinsicElements["div"]) => (
	<div {...props} class={cn("flex flex-col space-y-1.5 p-6", props.class)} />
);

const CardTitle = (props: JSX.IntrinsicElements["h3"]) => (
	<h3
		{...props}
		class={cn("font-semibold leading-none tracking-tight", props.class)}
	/>
);

const CardDescription = (props: JSX.IntrinsicElements["p"]) => (
	<p {...props} class={cn("text-sm text-muted-foreground", props.class)} />
);

const CardContent = (props: JSX.IntrinsicElements["div"]) => (
	<div {...props} class={cn("p-6 pt-0", props.class)} />
);

const CardFooter = (props: JSX.IntrinsicElements["div"]) => (
	<div {...props} class={cn("flex items-center p-6 pt-0", props.class)} />
);

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardDescription,
	CardContent,
};
