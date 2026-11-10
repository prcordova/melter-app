/** Rola o wizard até o campo. Refs em `any` por causa do tipo de `ref` do React Native neste projeto. */
export function scrollFieldIntoView(
  scrollRef: { current: any } | undefined,
  fieldRef: { current: any } | undefined,
  /** Offset vertical atual do ScrollView (`onScroll` → `contentOffset.y`). */
  currentScrollY = 0
) {
  const scroll = scrollRef?.current;
  const field = fieldRef?.current;
  if (!scroll || !field) return;

  const applyScroll = (contentY: number) => {
    // Offset maior: campo fica acima do termômetro/footer ao focar
    scroll.scrollTo({ y: Math.max(0, contentY - 72), animated: true });
  };

  const fallbackFromWindow = () => {
    if (typeof field.measureInWindow !== 'function' || typeof scroll.measureInWindow !== 'function') {
      return;
    }
    field.measureInWindow((_fx: number, fy: number, _fw: number, fh: number) => {
      scroll.measureInWindow((_sx: number, sy: number, _sw: number, sh: number) => {
        const targetTop = sy + 72;
        const fieldBottom = fy + fh;
        const visibleBottom = sy + sh - 24;
        if (fy >= targetTop && fieldBottom <= visibleBottom) return;
        applyScroll(currentScrollY + (fy - targetTop));
      });
    });
  };

  const inner = scroll.getInnerViewNode?.() ?? scroll;
  if (typeof field.measureLayout === 'function') {
    field.measureLayout(
      inner,
      (_x: number, y: number) => applyScroll(y),
      () => fallbackFromWindow()
    );
    return;
  }

  fallbackFromWindow();
}
