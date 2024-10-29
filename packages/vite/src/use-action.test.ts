import { transform } from "@babel/core";
// actionFunctionTransformer.test.js
import { describe, expect, test } from "vitest";

import { useActionBabelPlugin } from "./use-action.js";

function transformCode(code: string) {
	return transform(code, {
		plugins: [useActionBabelPlugin({ onAction: (name) => name })],
		configFile: false,
	})?.code;
}

describe("actionFunctionTransformer", () => {
	test("transforms regular function correctly", () => {
		const input = `
      function myAction() {
        "use action";
        return 42;
      }
    `;

		const output = transformCode(input);

		expect(output).toContain('myAction.$$typeof = Symbol.for("server.action")');
		expect(output).toContain('myAction.$$action = "action_myAction"');
		expect(output).toContain("export { myAction as action_myAction };");
	});

	test("transforms arrow function correctly", () => {
		const input = `
      const myArrowAction = () => {
        "use action";
        return 42;
      }
    `;

		const output = transformCode(input);

		expect(output).toContain(
			'myArrowAction.$$typeof = Symbol.for("server.action")',
		);
		expect(output).toContain('myArrowAction.$$action = "action_myArrowAction"');
		expect(output).toContain(
			"export { myArrowAction as action_myArrowAction };",
		);
	});

	test("transforms anonymous regular function", () => {
		const input = `
      const myAction = function() {
        "use action";
        return 42;
      }
    `;

		const output = transformCode(input);

		expect(output).toContain('myAction.$$typeof = Symbol.for("server.action")');
		expect(output).toContain('myAction.$$action = "action_myAction"');
		expect(output).toContain("export { myAction as action_myAction };");
	});

	test("throws error for non-module scope regular function", () => {
		const input = `
      function outer() {
        function inner() {
          "use action";
          return 42;
        }
      }
    `;

		expect(() => transformCode(input)).toThrowError(
			"Action functions must be declared in the module scope.",
		);
	});

	test("throws error for non-module scope arrow function", () => {
		const input = `
      function outer() {
        const inner = () => {
          "use action";
          return 42;
        }
      }
    `;

		expect(() => transformCode(input)).toThrowError(
			"Action functions must be declared in the module scope.",
		);
	});

	test("throws error for anonymous arrow function", () => {
		const input = `
      (() => {
        "use action";
        return 42;
      })();
    `;

		expect(() => transformCode(input)).toThrowError(
			"unknown file: Action functions must be named functions or assigned to a variable.",
		);
	});

	test('does not transform functions without "use action" directive', () => {
		const input = `
      function regularFunction() {
        return 42;
      }

      const arrowFunction = () => {
        return 42;
      }
    `;

		const output = transformCode(input);

		expect(output).not.toContain("$$typeof");
		expect(output).not.toContain("$$action");
		expect(output).not.toContain("export");
	});

	test("transforms multiple action functions", () => {
		const input = `
      function action1() {
        "use action";
        return 1;
      }

      const action2 = () => {
        "use action";
        return 2;
      }
    `;

		const output = transformCode(input);

		expect(output).toContain('action1.$$typeof = Symbol.for("server.action")');
		expect(output).toContain('action1.$$action = "action_action1"');
		expect(output).toContain("export { action1 as action_action1 };");

		expect(output).toContain('action2.$$typeof = Symbol.for("server.action")');
		expect(output).toContain('action2.$$action = "action_action2"');
		expect(output).toContain("export { action2 as action_action2 };");
	});
});
