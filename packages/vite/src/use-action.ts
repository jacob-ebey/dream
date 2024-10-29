import * as babel from "@babel/core";

export function useActionBabelPlugin({
	onAction,
}: {
	onAction: (name: string) => string;
}): babel.PluginObj {
	const { types: t } = babel;

	return {
		name: "action-function-transformer",
		visitor: {
			Program(path) {
				const actionFunctions = new Map<
					babel.NodePath<
						babel.types.Function | babel.types.ArrowFunctionExpression
					>,
					string
				>();

				// First pass: collect all action functions
				path.traverse({
					// @ts-expect-error - Babel types are incomplete
					"FunctionDeclaration|FunctionExpression|ArrowFunctionExpression"(
						functionPath: babel.NodePath<
							babel.types.Function | babel.types.ArrowFunctionExpression
						>,
					) {
						const directive = (
							functionPath.node.body as babel.types.BlockStatement
						).directives?.find(
							(directive) => directive.value.value === "use action",
						);

						if (directive) {
							if (!functionPath.scope.parent.path.isProgram()) {
								throw functionPath.buildCodeFrameError(
									"Action functions must be declared in the module scope.",
								);
							}

							let functionName: string | null = null;

							if (
								t.isFunctionDeclaration(functionPath.node) &&
								functionPath.node.id
							) {
								functionName = functionPath.node.id.name;
							} else if (t.isVariableDeclarator(functionPath.parent)) {
								const id = functionPath.parent.id;
								if (t.isIdentifier(id)) {
									functionName = id.name;
								}
							}

							if (!functionName) {
								throw functionPath.buildCodeFrameError(
									"Action functions must be named functions or assigned to a variable.",
								);
							}

							actionFunctions.set(functionPath, functionName);
						}
					},
				});

				// Second pass: transform and export action functions
				actionFunctions.forEach((functionName, functionPath) => {
					const exportedName = `action_${functionName}`;

					// Add $$typeof and $$action properties
					const assignmentExpressions = [
						t.expressionStatement(
							t.assignmentExpression(
								"=",
								t.memberExpression(
									t.identifier(functionName),
									t.identifier("$$typeof"),
								),
								t.callExpression(
									t.memberExpression(
										t.identifier("Symbol"),
										t.identifier("for"),
									),
									[t.stringLiteral("server.action")],
								),
							),
						),
						t.expressionStatement(
							t.assignmentExpression(
								"=",
								t.memberExpression(
									t.identifier(functionName),
									t.identifier("$$action"),
								),
								t.stringLiteral(onAction(exportedName)),
							),
						),
					];

					if (t.isFunctionDeclaration(functionPath.node)) {
						functionPath.insertAfter(assignmentExpressions);
					} else {
						const parentStatement = functionPath.getStatementParent();
						if (parentStatement) {
							parentStatement.insertAfter(assignmentExpressions);
						}
					}

					// Add named export
					path.pushContainer(
						"body",
						t.exportNamedDeclaration(null, [
							t.exportSpecifier(
								t.identifier(functionName),
								t.identifier(exportedName),
							),
						]),
					);
				});
			},
		},
	};
}
