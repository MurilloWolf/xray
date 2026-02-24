(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

if (typeof window !== 'undefined' && typeof globalThis.fetch === 'function') {
  window.fetch = globalThis.fetch.bind(globalThis);
}
