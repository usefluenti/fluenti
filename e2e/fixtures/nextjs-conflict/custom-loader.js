/**
 * Simple webpack loader that injects a data-custom-loader attribute
 * on elements with data-testid. This simulates a third-party loader
 * that also processes .tsx files, verifying coexistence with the
 * Fluenti loader when loaderEnforce is set to undefined.
 */
module.exports = function (source) {
  // Only inject on files that contain data-testid (avoid breaking non-component files)
  if (!source.includes('data-testid=')) return source
  return source.replace(/data-testid="/g, 'data-custom-loader="true" data-testid="')
}
