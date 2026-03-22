/**
 * Re-export from `@fluenti/core/internal`.
 *
 * **Stability contract**: These APIs are considered semi-stable for use by
 * first-party framework plugins (`@fluenti/next`, `@fluenti/vue`, etc.).
 * Breaking changes will be coordinated across all first-party packages
 * within the same major version. Third-party consumers should prefer the
 * public `@fluenti/core` API surface.
 */
export { transformTransComponents } from '@fluenti/core/internal'
export type { TransTransformResult } from '@fluenti/core/internal'
