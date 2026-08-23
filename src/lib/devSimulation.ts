/**
 * DEV simulation flag + production safety guard.
 *
 * The DEV environment can be upgraded into a complete internal simulation
 * (isolated demo restaurant, customers, rewards, offers, reviews) by setting
 * `VITE_DEV_SIMULATION=true`. Every demo record is gated behind
 * `isDevSimulation()` so production and the real 206 restaurants are never
 * touched — and the guard below refuses to start a production build with the
 * flag enabled (same contract as `VITE_DEV_AUTH_MOCK`).
 *
 * See src/data/devSimulation.ts for the isolated demo data.
 */

/** True only in a non-production *environment* with the simulation flag set. */
export function isDevSimulation(): boolean {
  // Unit tests always exercise the real mock repositories, so never treat the
  // test run as a dev simulation even if the flag leaks in.
  if (import.meta.env.MODE === 'test') return false;
  // Gate on the project-level environment (VITE_APP_ENV), NOT the Vite build
  // MODE. The DEV Vercel project is shipped as a *production build*
  // (import.meta.env.MODE === 'production') but is a *non-production
  // environment* (VITE_APP_ENV === 'development'). This is the same
  // discriminator assertDevSimulationNotProduction() and the dev-auth guard
  // use, so a flag set on the real production project still fails loudly while
  // the dev project (and a local `npm run dev`) activate the simulation.
  const appEnv = import.meta.env.VITE_APP_ENV || 'production';
  return import.meta.env.VITE_DEV_SIMULATION === 'true' && appEnv !== 'production';
}

/**
 * Production safety: throw at module load if the simulation flag is enabled in
 * a production deployment. Uses VITE_APP_ENV (the same contract as the dev-auth
 * guard) so a local `npm run build` (which sets MODE=production but keeps
 * VITE_APP_ENV=development) does not accidentally refuse to build — while a
 * real production deploy with the flag on fails loudly. Called from the
 * repository seams so a misconfigured deploy never leaks demo data.
 */
export function assertDevSimulationNotProduction(): void {
  const appEnv = import.meta.env.VITE_APP_ENV || 'production';
  if (import.meta.env.VITE_DEV_SIMULATION === 'true' && appEnv === 'production') {
    throw new Error(
      'VITE_DEV_SIMULATION is enabled in a production environment — refusing to start. ' +
        'Demo simulation data must never ship to production.',
    );
  }
}
