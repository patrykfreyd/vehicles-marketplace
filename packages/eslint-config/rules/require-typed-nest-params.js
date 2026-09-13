// Custom rule backing plans/05-backend-api-foundation.md §5: "No controller
// accepts or returns a raw object without a Zod DTO — enforced by an
// ESLint rule ... rejecting untyped @Body()/@Query()/@Param() parameters."
//
// What it checks, per decorated parameter:
//   - `@Body()` / `@Query()` / `@Param()` with NO arguments binds the whole
//     body/query/params object, so the parameter must be annotated with a
//     named type (a `createZodDto(...)` class, in practice) — missing
//     annotations, `any`, and `unknown` are rejected.
//   - The same decorators called WITH an argument (`@Query('page')`,
//     `@Param('id')`) bind a single field instead, so any explicit
//     annotation is accepted — just not a missing one or `any`/`unknown`.
// It does not (and cannot, from syntax alone) verify the referenced type is
// actually `createZodDto`-backed; that's a code-review concern, not a
// lint-time one. See rules/require-typed-nest-params.test.ts for the
// worked examples this rule is expected to accept/reject.
const { ESLintUtils } = require('@typescript-eslint/utils');

const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/vehicles-marketplace/vehicles-marketplace/blob/main/packages/eslint-config/rules/${name}.js`,
);

const WHOLE_OBJECT_DECORATORS = new Set(['Body', 'Query', 'Param']);

/** True for `any`/`unknown`/a bare object type literal — none of these
 * actually pin down a shape, so they don't count as "typed" for this rule. */
function isUnhelpfulType(typeAnnotation) {
  return (
    typeAnnotation.type === 'TSAnyKeyword' ||
    typeAnnotation.type === 'TSUnknownKeyword' ||
    (typeAnnotation.type === 'TSTypeLiteral' && typeAnnotation.members.length === 0)
  );
}

function getDecoratorCall(decorator) {
  const expression = decorator.expression;
  if (expression.type === 'CallExpression' && expression.callee.type === 'Identifier') {
    return { name: expression.callee.name, argCount: expression.arguments.length };
  }
  return null;
}

function describeParam(param) {
  if (param.type === 'Identifier') return param.name;
  if (param.type === 'ObjectPattern' || param.type === 'ArrayPattern')
    return 'destructured parameter';
  return 'parameter';
}

module.exports = createRule({
  name: 'require-typed-nest-params',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require @Body()/@Query()/@Param() handler parameters to carry an explicit, named type instead of being left untyped or typed any/unknown.',
    },
    schema: [],
    messages: {
      missingType:
        '@{{decorator}}() parameter "{{param}}" has no type annotation — give it one (a createZodDto() class for a whole-object @{{decorator}}()).',
      unhelpfulType:
        '@{{decorator}}() parameter "{{param}}" is typed `{{typeText}}`, which does not enforce any shape — annotate it with a createZodDto() class instead.',
    },
  },
  defaultOptions: [],
  create(context) {
    function checkParam(param, decorator) {
      const call = getDecoratorCall(decorator);
      if (!call || !WHOLE_OBJECT_DECORATORS.has(call.name)) return;

      const target = param.type === 'TSParameterProperty' ? param.parameter : param;
      const typeAnnotation = target.typeAnnotation?.typeAnnotation;
      const paramName = describeParam(target);

      if (!typeAnnotation) {
        context.report({
          node: param,
          messageId: 'missingType',
          data: { decorator: call.name, param: paramName },
        });
        return;
      }

      // A single named-field extraction (`@Query('page')`) only needs to be
      // typed at all — no need to be a DTO class.
      if (call.argCount > 0) return;

      if (isUnhelpfulType(typeAnnotation)) {
        context.report({
          node: param,
          messageId: 'unhelpfulType',
          data: {
            decorator: call.name,
            param: paramName,
            typeText: context.sourceCode.getText(typeAnnotation),
          },
        });
      }
    }

    return {
      ':function'(node) {
        for (const param of node.params) {
          // Decorators attach to the parameter node itself either way — a
          // plain `@Body() dto` Identifier, or (for a constructor parameter
          // property like `@Inject() private foo`) the TSParameterProperty
          // wrapping it.
          if (!param.decorators?.length) continue;
          for (const decorator of param.decorators) {
            checkParam(param, decorator);
          }
        }
      },
    };
  },
});
