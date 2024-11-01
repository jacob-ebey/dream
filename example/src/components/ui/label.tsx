import { cva, type VariantProps } from "class-variance-authority";
import type { JSX } from "dream/jsx";

import { cn } from "~/lib/utils.js";

const labelVariants = cva(
	"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

export type LabelProps = VariantProps<typeof labelVariants> &
	JSX.IntrinsicElements["label"];

const Label = (props: LabelProps) => (
	// biome-ignore lint/a11y/noLabelWithoutControl: <explanation>
	<label
		onmousedown="if (!event.target.closest('button, input, select, textarea') && !event.defaultPrevented && event.detail > 1) event.preventDefault();"
		{...props}
		class={cn(labelVariants(), props.class)}
	/>
);

export { Label };
