/**
 * Server-side only. Development tools (Events, Proposals, Templates, Settings)
 * are hidden in production unless BLOOM_ENABLE_DEV_TOOLS=1 is set explicitly.
 * This is interface organization, not authorization: the routes themselves
 * stay reachable and protected by the existing active-owner access model.
 */
export function devToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.BLOOM_ENABLE_DEV_TOOLS === "1";
}
