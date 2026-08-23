import type { DemoUser } from '../domain/auth';
import { hashPassword } from '../lib/demoAuth';
import {
  KK_DEMO_RESTAURANT_ADMIN_ID,
  KK_DEMO_RESTAURANT_ADMIN_CONTACT,
  KK_DEMO_RESTAURANT_ID,
} from './devSimulation';

/**
 * Seeded demo accounts. Passwords are hashed at seed time (never plaintext).
 * Every account is clearly a demo — no real credentials exist.
 *
 * Development-only demo accounts using valid Bangladesh mobile formats:
 *  - 01712345678  → Khabo Kothay executive admin
 *  - 01812345678  → Seasonal Tastes restaurant admin (real Dhaka venue)
 *  - 01912345678  → Almajlis Arabian Restaurant admin (real Dhaka venue)
 *  - 01612345678  → regular user (partially completed profile)
 *  - 01512345678  → regular user (fresh account)
 *
 * NOTE: These are development-only accounts. In production, phone-based
 * authentication uses real Supabase Auth with SMS delivery.
 */
export const DEMO_PASSWORD = 'demo123';

/** Stable ids of every seeded demo account — used to gate demo-only tools. */
export const DEMO_USER_IDS = [
  'exec-kk',
  'owner-arsalan',
  'owner-bhojohori',
  'user-ananya',
  'user-rahul',
  // Dev-simulation only accounts (seeded when VITE_DEV_SIMULATION is on).
  'kk-demo-owner',
  'kk-demo-customer-aisha',
  'kk-demo-customer-rafi',
  'kk-demo-customer-nila',
];

export const DEMO_ACCOUNT_CREDENTIALS: Array<{ contact: string; role: string; restaurant?: string }> = [
  { contact: '01712345678', role: 'executive' },
  { contact: '01812345678', role: 'restaurant_admin', restaurant: 'Seasonal Tastes' },
  { contact: '01912345678', role: 'restaurant_admin', restaurant: 'Almajlis Arabian Restaurant' },
  { contact: '01612345678', role: 'user' },
  { contact: '01512345678', role: 'user' },
  // Dev-simulation only — the KK Demo Restaurant owner login.
  { contact: KK_DEMO_RESTAURANT_ADMIN_CONTACT, role: 'restaurant_admin', restaurant: 'KK Demo Restaurant' },
];

/**
 * Dev-simulation-only accounts. These are layered on top of the base demo
 * accounts and only seeded when `isDevSimulation()` is true, so they never
 * appear in production or in a plain dev build without the simulation flag.
 */
/**
 * The KK Demo Restaurant admin account. Seeded in any development-auth context
 * (VITE_DEV_AUTH_MOCK) — not only when the full simulation is enabled — so the
 * "Restaurant admin · KK Demo Restaurant" demo login resolves to the correct
 * role. Kept separate from the rest of the simulation (menu / reviews / offers
 * / demo customers), which remain gated behind VITE_DEV_SIMULATION.
 */
export async function seedKKDemoRestaurantAdmin(): Promise<DemoUser> {
  const hash = await hashPassword(DEMO_PASSWORD);
  return {
    createdAt: '2026-07-01',
    passwordHash: hash,
    id: KK_DEMO_RESTAURANT_ADMIN_ID,
    name: 'KK Demo Restaurant Management',
    contact: KK_DEMO_RESTAURANT_ADMIN_CONTACT,
    role: 'restaurant_admin',
    restaurantIds: [KK_DEMO_RESTAURANT_ID],
    profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
    completedFields: [],
    badges: [],
    referralCode: 'KKDEMO-OWNER',
    referrals: [],
    completionRewardClaimed: false,
  };
}

export async function seedDevSimulationAccounts(): Promise<DemoUser[]> {
  const hash = await hashPassword(DEMO_PASSWORD);
  const base = { createdAt: '2026-07-01', passwordHash: hash } as const;

  return [
    await seedKKDemoRestaurantAdmin(),
    {
      ...base,
      id: 'kk-demo-customer-aisha',
      name: 'Aisha Rahman',
      contact: '01311112222',
      role: 'user',
      restaurantIds: [],
      profile: {
        cuisines: ['Bengali', 'Biryani'],
        budget: 'Mid-range',
        diet: 'any',
        neighbourhoods: ['Gulshan', 'Banani'],
        diningInterests: ['Family dinners', 'Biryani'],
      },
      completedFields: ['name', 'contact', 'cuisines', 'budget', 'neighbourhoods', 'diet', 'interests'],
      badges: [
        { id: 'badge-first-review', label: 'First review', description: 'Wrote a review on the platform', earnedAt: '2026-07-18' },
      ],
      referralCode: 'AISHA-KK',
      referrals: [{ id: 'kk-ref-a1', name: 'Tasnim A.', status: 'verified', rewarded: true }],
      completionRewardClaimed: false,
      bio: 'Always hunting for the next great biryani plate.',
    },
    {
      ...base,
      id: 'kk-demo-customer-rafi',
      name: 'Rafi Chowdhury',
      contact: '01333344444',
      role: 'user',
      restaurantIds: [],
      profile: {
        cuisines: ['Bengali'],
        budget: 'Mid-range',
        diet: 'any',
        neighbourhoods: ['Dhanmondi'],
        diningInterests: ['Family dinners'],
      },
      completedFields: ['name', 'contact', 'cuisines', 'budget', 'neighbourhoods', 'diet', 'interests'],
      badges: [],
      referralCode: 'RAFI-KK',
      referrals: [],
      completionRewardClaimed: false,
    },
    {
      ...base,
      id: 'kk-demo-customer-nila',
      name: 'Nila Sultana',
      contact: '01355566666',
      role: 'user',
      restaurantIds: [],
      profile: {
        cuisines: ['Seafood', 'Chinese'],
        budget: 'Premium',
        diet: 'any',
        neighbourhoods: ['Gulshan'],
        diningInterests: ['Rooftop dining', 'Date night'],
      },
      completedFields: ['name', 'contact', 'cuisines', 'budget', 'neighbourhoods', 'diet', 'interests'],
      badges: [],
      referralCode: 'NILA-KK',
      referrals: [{ id: 'kk-ref-n1', name: 'Imran S.', status: 'invited', rewarded: false }],
      completionRewardClaimed: false,
    },
  ];
}

export async function seedDemoAccounts(): Promise<DemoUser[]> {
  const hash = await hashPassword(DEMO_PASSWORD);
  const base = { createdAt: '2026-07-01', passwordHash: hash } as const;

  const accounts: DemoUser[] = [
    {
      ...base,
      id: 'exec-kk',
      name: 'Executive Admin',
      contact: '01712345678',
      role: 'executive',
      restaurantIds: [],
      profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
      completedFields: [],
      badges: [],
      referralCode: 'KK-EXEC',
      referrals: [],
      completionRewardClaimed: false,
    },
    {
      ...base,
      id: 'owner-arsalan',
      name: 'Seasonal Tastes Management',
      contact: '01812345678',
      role: 'restaurant_admin',
      restaurantIds: ['seasonal-tastes'],
      profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
      completedFields: [],
      badges: [],
      referralCode: 'SEASONAL-OWNER',
      referrals: [],
      completionRewardClaimed: false,
    },
    {
      ...base,
      id: 'owner-bhojohori',
      name: 'Almajlis Management',
      contact: '01912345678',
      role: 'restaurant_admin',
      restaurantIds: ['almajlis-arabian-restaurant'],
      profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
      completedFields: [],
      badges: [],
      referralCode: 'ALMAJLIS-OWNER',
      referrals: [],
      completionRewardClaimed: false,
    },
    {
      ...base,
      id: 'user-ananya',
      name: 'Ananya Dutta',
      contact: '01612345678',
      role: 'user',
      restaurantIds: [],
      avatarUrl: undefined,
      profile: {
        cuisines: ['Bengali', 'Biryani'],
        budget: 'Mid-range',
        diet: 'any',
        neighbourhoods: ['Gulshan', 'Banani'],
        diningInterests: ['Home-style food', 'Family dinners'],
      },
      completedFields: ['name', 'contact', 'cuisines', 'budget', 'neighbourhoods', 'diet', 'interests'],
      badges: [
        { id: 'badge-first-review', label: 'First review', description: 'Wrote a review on the platform', earnedAt: '2026-07-12' },
      ],
      referralCode: 'ANANYA-FOODIE',
      referrals: [
        { id: 'ref-1', name: 'Priya Sen', status: 'verified', rewarded: true },
      ],
      completionRewardClaimed: false,
      bio: 'Dhaka food lover — always hunting for the next great plate.'
    },
    {
      ...base,
      id: 'user-rahul',
      name: 'Rahul Sharma',
      contact: '01512345678',
      role: 'user',
      restaurantIds: [],
      profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
      completedFields: [],
      badges: [],
      referralCode: 'RAHUL-EATS',
      referrals: [],
      completionRewardClaimed: false,
    },
  ];

  return accounts;
}
