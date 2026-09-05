export function shouldAnimateRoute(from: string, to: string, reducedMotion: boolean, hidden: boolean) {
  return from !== to && !reducedMotion && !hidden && !from.startsWith('/admin') && !to.startsWith('/admin');
}
