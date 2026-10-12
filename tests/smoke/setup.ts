// jsdom lacks several browser APIs the pages use.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
}
class NoopObserver { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
(globalThis as unknown as Record<string, unknown>).IntersectionObserver ??= NoopObserver;
(globalThis as unknown as Record<string, unknown>).ResizeObserver ??= NoopObserver;
window.scrollTo = (() => {}) as typeof window.scrollTo;
Element.prototype.scrollIntoView = () => {};
