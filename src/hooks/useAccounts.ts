import {
  DEMO_ACCOUNT_CREDENTIALS,
  DEMO_PASSWORD,
  DEMO_USER_IDS,
  seedDemoAccounts,
} from '../data/demoAccounts';

/**
 * Demo-account adapter — the hooks-layer seam for the seeded demo account
 * data. Login and admin surfaces import from here, never from the raw seed.
 */
export { DEMO_ACCOUNT_CREDENTIALS, DEMO_PASSWORD, DEMO_USER_IDS, seedDemoAccounts };
