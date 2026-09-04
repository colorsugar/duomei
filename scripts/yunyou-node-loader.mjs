// Resolve the site's vendored Three.js imports for offline geometry verification.
const base = new URL('../public/yunyou/vendor/three/', import.meta.url);
export function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: new URL('three.module.js', base).href, shortCircuit: true };
  if (specifier.startsWith('three/addons/')) return { url: new URL(specifier.slice(6), base).href, shortCircuit: true };
  return next(specifier, context);
}
