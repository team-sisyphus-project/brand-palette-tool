/**
 * Pure helpers that derive the dev/preview server settings from the
 * environment. Kept out of `vite.config.ts` so they can be unit-tested
 * without loading Vite (and esbuild) into the test environment.
 */

/**
 * Reads the listening port from the environment.
 *
 * The platform injects `PORT`; nothing may be hardcoded. `fallback` is only
 * used for local runs where the variable is unset.
 */
export function resolvePort(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535
    ? parsed
    : fallback
}

/**
 * Resolves Vite's host allow-list.
 *
 * Vite rejects requests whose `Host` header is not in this list (DNS-rebinding
 * protection). Behind the platform's TLS terminator the public hostname is
 * assigned at runtime and unknown at build time, so requests arrive with a
 * `Host` we cannot enumerate here — hence `true` (accept any) by default.
 * Setting `ALLOWED_HOSTS` to a comma-separated list narrows it back down when
 * the hostname *is* known.
 */
export function resolveAllowedHosts(
  value: string | undefined,
): true | string[] {
  const hosts = (value ?? '')
    .split(',')
    .map((host) => host.trim())
    .filter((host) => host.length > 0)
  return hosts.length > 0 ? hosts : true
}
