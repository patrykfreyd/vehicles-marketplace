/**
 * Shared domain TS types, consumed by web/api/mobile without any build step
 * (see packages/tsconfig and the root README for how source-only packages
 * are resolved).
 *
 * Per plans/03-shared-types-validation.md §2: a schema is always written
 * once, in `@vehicles-marketplace/validation`; its type is re-exported from
 * here via `z.infer`, never hand-duplicated. That lets UI code import a
 * plain type without pulling `zod` itself into its dependency graph — every
 * import below is `import type`, so it's erased at compile time and adds no
 * runtime dependency on `validation` or `zod`.
 */
import type {
  ApiError,
  BodyStyle,
  Drivetrain,
  FuelType,
  HealthStatus,
  MoneyPence,
  PageRequest,
  PageResponse,
  Transmission,
} from '@vehicles-marketplace/validation';

export type {
  ApiError,
  BodyStyle,
  Drivetrain,
  FuelType,
  HealthStatus,
  MoneyPence,
  PageRequest,
  PageResponse,
  Transmission,
};

/**
 * Branded string ID so different entity IDs can't be swapped by accident
 * (e.g. passing a `DerivativeId` where a `VehicleId` is expected). Each
 * owning plan adds its own `type FooId = Id<'Foo'>` alias when it
 * introduces that entity — see plans/03-shared-types-validation.md §5.
 */
export type Id<Brand extends string> = string & { readonly __brand: Brand };
