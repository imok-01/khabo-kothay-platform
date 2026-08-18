/**
 * uid — tiny unique-id helper.
 *
 * Lives in lib so UI components never import the demo store for a pure
 * utility. The demo store re-exports it to keep its public API stable.
 */
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
