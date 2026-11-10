/**
 * The package is built as two entries (index and react), each bundling its own copy of the
 * client class. A static field would give each entry its own client, and an event sent through
 * `MetricsDash.trackEvent` would never reach the client started by the React provider. The
 * single client therefore lives on globalThis, shared by every copy.
 */
const SHARED_KEY = '__metrics_dash_client__';
const store = globalThis as unknown as Record<string, unknown>;

export function getSharedClient<T>(): T | null {
  return (store[SHARED_KEY] as T | undefined) ?? null;
}

export function setSharedClient<T>(client: T | null): void {
  store[SHARED_KEY] = client;
}
