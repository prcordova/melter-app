/** Sobe na árvore até achar o Bottom Tab Navigator (FeedTab, ProfileStack, …). */
export function getTabNavigator(nav: { getParent?: () => unknown; getState?: () => { routeNames?: string[] } } | null): {
  navigate: (name: string, params?: Record<string, unknown>) => void;
} | null {
  let current: typeof nav = nav;
  for (let i = 0; i < 8 && current; i += 1) {
    const names = current.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('FeedTab')) {
      return current as { navigate: (name: string, params?: Record<string, unknown>) => void };
    }
    current = current.getParent?.() as typeof nav;
  }
  return null;
}
