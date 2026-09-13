// Not a real business queue — every actual queue (image processing,
// notifications, ...) is registered by its owning plan. This one exists
// only to prove the BullMQ pipeline end-to-end, per
// plans/05-backend-api-foundation.md §9's acceptance criterion.
export const DIAGNOSTICS_QUEUE = 'diagnostics';
