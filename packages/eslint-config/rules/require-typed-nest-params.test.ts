// Proves plans/05-backend-api-foundation.md §5's ESLint rule actually
// rejects an untyped @Body() parameter (its acceptance criterion), rather
// than just being documented. Each "invalid" case below is a stand-in for
// the "test controller" the acceptance criterion describes: real source
// this rule must flag, verified through ESLint's own rule-testing harness
// instead of committing broken code that `pnpm lint` would then fail on.
import { afterAll, describe, it } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './require-typed-nest-params';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: {},
    },
  },
});

ruleTester.run('require-typed-nest-params', rule, {
  valid: [
    // Whole-object @Body()/@Query()/@Param(), typed with a named DTO class.
    'class C { create(@Body() dto: CreateFooDto) {} }',
    'class C { list(@Query() query: ListFooQueryDto) {} }',
    'class C { remove(@Param() params: FooParamsDto) {} }',
    // Whole-object @Body() typed with an array of a named DTO class.
    'class C { createMany(@Body() dtos: CreateFooDto[]) {} }',
    // Single named-field extraction only needs some real type, not a DTO.
    'class C { list(@Query("page") page: number) {} }',
    'class C { remove(@Param("id") id: string) {} }',
    // A decorator this rule doesn't govern (e.g. @Req()) is left alone.
    'class C { create(@Req() req: Request) {} }',
    // Constructor parameter properties are checked the same way.
    'class C { constructor(@Body() private readonly dto: CreateFooDto) {} }',
  ],
  invalid: [
    {
      code: 'class C { create(@Body() dto) {} }',
      errors: [{ messageId: 'missingType' }],
    },
    {
      code: 'class C { list(@Query() query) {} }',
      errors: [{ messageId: 'missingType' }],
    },
    {
      code: 'class C { create(@Body() dto: any) {} }',
      errors: [{ messageId: 'unhelpfulType' }],
    },
    {
      code: 'class C { create(@Body() dto: unknown) {} }',
      errors: [{ messageId: 'unhelpfulType' }],
    },
    {
      code: 'class C { create(@Body() dto: {}) {} }',
      errors: [{ messageId: 'unhelpfulType' }],
    },
    {
      code: 'class C { remove(@Param("id") id) {} }',
      errors: [{ messageId: 'missingType' }],
    },
    {
      code: 'class C { constructor(@Body() private readonly dto) {} }',
      errors: [{ messageId: 'missingType' }],
    },
  ],
});
