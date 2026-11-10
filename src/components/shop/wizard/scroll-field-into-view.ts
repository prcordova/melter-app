/** Rola o wizard até o campo. Refs em `any` por causa do tipo de `ref` do React Native neste projeto. */
export function scrollFieldIntoView(
  scrollRef: { current: any } | undefined,
  fieldRef: { current: any } | undefined
) {
  const scroll = scrollRef?.current;
  const field = fieldRef?.current;
  if (!scroll || !field?.measureLayout) return;
  const node = scroll.getInnerViewNode?.() ?? scroll;
  field.measureLayout(
    node,
    (_x: number, y: number) => scroll.scrollTo({ y: Math.max(0, y - 12), animated: true }),
    () => scroll.scrollTo?.({ y: 0, animated: true })
  );
}
