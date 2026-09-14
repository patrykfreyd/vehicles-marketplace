/**
 * DI tokens for this module, split out from auth.module.ts so guards/
 * decorators can `@Inject(AUTH)` without importing the module itself (which
 * would otherwise create a circular import: the module also imports the
 * guards to register them as providers).
 */
export const AUTH = Symbol('AUTH');
