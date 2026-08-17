import type { DemoUser } from '../domain/auth';
import { hashPassword } from '../lib/demoAuth';

/**
 * Seeded demo accounts. Passwords are hashed at seed time (never plaintext).
 * Every account is clearly a demo — no real credentials exist.
 *
 * Available demo logins (password: `demo123`):
 *  - executive@khabokothay.in  → Khabo Kothay executive admin
 *  - owner@arsalan.in          → Seasonal Tastes restaurant admin (real Dhaka venue)
 *  - owner@bhojohori.in        → Almajlis Arabian Restaurant admin (real Dhaka venue)
 *  - ananya@example.com        → regular user (partially completed profile)
 *  - rahul@example.com         → regular user (fresh account)
 */
export const DEMO_PASSWORD = 'demo123';

/** Stable ids of every seeded demo account — used to gate demo-only tools. */
export const DEMO_USER_IDS = ['exec-kk', 'owner-arsalan', 'owner-bhojohori', 'user-ananya', 'user-rahul'];

export const DEMO_ACCOUNT_CREDENTIALS: Array<{ contact: string; role: string; restaurant?: string }> = [
  { contact: 'executive@khabokothay.in', role: 'executive' },
  { contact: 'owner@arsalan.in', role: 'restaurant_admin', restaurant: 'Seasonal Tastes' },
  { contact: 'owner@bhojohori.in', role: 'restaurant_admin', restaurant: 'Almajlis Arabian Restaurant' },
  { contact: 'ananya@example.com', role: 'user' },
  { contact: 'rahul@example.com', role: 'user' },
];

export async function seedDemoAccounts(): Promise<DemoUser[]> {
  const hash = await hashPassword(DEMO_PASSWORD);
  const base = { createdAt: '2026-07-01', passwordHash: hash } as const;

  const accounts: DemoUser[] = [
    {
      ...base,
      id: 'exec-kk',
      name: 'Executive Admin',
      contact: 'executive@khabokothay.in',
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
      contact: 'owner@arsalan.in',
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
      contact: 'owner@bhojohori.in',
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
      contact: 'ananya@example.com',
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
      contact: 'rahul@example.com',
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
