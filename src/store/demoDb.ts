import { useCallback, useEffect, useRef, useState } from 'react';
import type { DemoUser, SessionUser } from '../domain/auth';
import type { UserReview } from '../domain/review';

// The KK community review type now lives in domain/review.ts — re-exported
// here so existing importers keep compiling. Prefer domain/review going forward.
export type { UserReview } from '../domain/review';
import type { Menu } from '../domain/menu';
import type { Coupon, ReferralInvite, RewardTransaction } from '../domain/rewards';
import type { IntelligenceSuggestion } from '../domain/intelligence';

/**
 * Demo persistence layer.
 *
 * Everything is stored in localStorage so the app behaves like it has a
 * backend without having one. The shape mirrors what a future API would
 * expose (users, sessions, menus, offers, reviews, rewards) so the demo can
 * be swapped for real endpoints without rewriting components.
 */

const KEY = {
  users: 'khabo-kothay:demo:users',
  session: 'khabo-kothay:demo:session',
  menus: 'khabo-kothay:demo:menus',
  adminOffers: 'khabo-kothay:demo:admin-offers',
  userReviews: 'khabo-kothay:demo:user-reviews',
  rewards: 'khabo-kothay:demo:rewards',
  flagged: 'khabo-kothay:demo:flagged',
  drafts: 'khabo-kothay:demo:restaurant-drafts',
  suggestions: 'khabo-kothay:demo:intelligence-suggestions',
} as const;

export interface AdminOfferDraft {
  id: string;
  restaurantId: string;
  title: string;
  value: string;
  discountLabel: string;
  validity: string;
  terms: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
}


export interface RewardsState {
  transactions: RewardTransaction[];
  coupons: Coupon[];
  referrals: ReferralInvite[];
  /** Cuisines already "discovered" by the user (drives the capped +5 reward). */
  discoveredCuisines: string[];
}

/**
 * Restaurant profile edits go through draft → pending → published so that
 * restaurants cannot instantly rewrite information users rely on. Fields are
 * optional so a draft only carries what the owner actually changed; published
 * drafts fall through to the base record for everything else.
 */
export interface RestaurantDraft {
  restaurantId: string;
  status: 'published' | 'draft' | 'pending' | 'rejected';
  name?: string;
  address?: string;
  openingHours?: string;
  cuisines?: string[];
  description?: string;
  tagline?: string;
  highlights?: string[];
  submittedAt?: string;
  updatedAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // corrupt storage — fall through to fallback
  }
  return fallback;
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/unavailable — demo data just won't persist
  }
}

/* ------------------------------------------------------------------ */
/* Reactive store core                                                 */
/* ------------------------------------------------------------------ */

type StoreKey = keyof typeof KEY;

const listeners = new Map<StoreKey, Set<() => void>>();

function subscribe(key: StoreKey, fn: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(fn);
  listeners.set(key, set);
  return () => {
    set.delete(fn);
  };
}

function emit(key: StoreKey) {
  listeners.get(key)?.forEach((fn) => fn());
}

function useStoreValue<T>(key: StoreKey, readFn: () => T): T {
  const [value, setValue] = useState<T>(readFn);
  useEffect(() => subscribe(key, () => setValue(readFn())), [key, readFn]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Users & session                                                     */
/* ------------------------------------------------------------------ */

export interface StoredUsers {
  byId: Record<string, DemoUser>;
}

export function getUsers(): StoredUsers {
  return read<StoredUsers>(KEY.users, { byId: {} });
}

export function saveUser(user: DemoUser) {
  const users = getUsers();
  users.byId[user.id] = user;
  write(KEY.users, users);
  emit('users');
}

export function getAllUsers(): DemoUser[] {
  return Object.values(getUsers().byId);
}

export function useUsers(): DemoUser[] {
  return useStoreValue<DemoUser[]>('users', getAllUsers);
}

export function getSession(): SessionUser | null {
  return read<SessionUser | null>(KEY.session, null);
}

export function setSession(session: SessionUser | null) {
  write(KEY.session, session);
  emit('session');
}

export function useSession(): SessionUser | null {
  return useStoreValue<SessionUser | null>('session', getSession);
}

/* ------------------------------------------------------------------ */
/* Menus (restaurant admin edits override the seed)                    */
/* ------------------------------------------------------------------ */

function menuKey(restaurantId: string): string {
  return `${KEY.menus}:${restaurantId}`;
}

export function getMenuOverride(restaurantId: string): Menu | null {
  return read<Menu | null>(menuKey(restaurantId), null);
}

export function saveMenuOverride(menu: Menu) {
  write(menuKey(menu.restaurantId), menu);
  bumpMenusVersion();
}

export function clearMenuOverride(restaurantId: string) {
  try {
    localStorage.removeItem(menuKey(restaurantId));
  } catch {
    // noop
  }
  bumpMenusVersion();
}

let menuVersion = 0;

export function useMenusVersion(): number {
  return useStoreValue<number>('menus', () => menuVersion);
}

function bumpMenusVersion() {
  menuVersion += 1;
  emit('menus');
}

/* ------------------------------------------------------------------ */
/* Admin-created offers                                                */
/* ------------------------------------------------------------------ */

export function getAdminOffers(): AdminOfferDraft[] {
  return read<AdminOfferDraft[]>(KEY.adminOffers, []);
}

export function useAdminOffers(): AdminOfferDraft[] {
  return useStoreValue<AdminOfferDraft[]>('adminOffers', getAdminOffers);
}

export function saveAdminOffers(offers: AdminOfferDraft[]) {
  write(KEY.adminOffers, offers);
  emit('adminOffers');
}

export function upsertAdminOffer(offer: AdminOfferDraft) {
  const all = getAdminOffers();
  const idx = all.findIndex((o) => o.id === offer.id);
  if (idx >= 0) all[idx] = offer;
  else all.push(offer);
  saveAdminOffers(all);
}

export function deleteAdminOffer(id: string) {
  saveAdminOffers(getAdminOffers().filter((o) => o.id !== id));
}

/* ------------------------------------------------------------------ */
/* User reviews                                                        */
/* ------------------------------------------------------------------ */

export function getUserReviews(): UserReview[] {
  return read<UserReview[]>(KEY.userReviews, []);
}

export function useUserReviews(): UserReview[] {
  return useStoreValue<UserReview[]>('userReviews', getUserReviews);
}

export function saveUserReviews(reviews: UserReview[]) {
  write(KEY.userReviews, reviews);
  emit('userReviews');
}

export function upsertUserReview(review: UserReview) {
  const all = getUserReviews();
  const idx = all.findIndex((r) => r.id === review.id);
  if (idx >= 0) all[idx] = review;
  else all.push(review);
  saveUserReviews(all);
}

export function deleteUserReview(id: string) {
  saveUserReviews(getUserReviews().filter((r) => r.id !== id));
}

/* ------------------------------------------------------------------ */
/* Rewards ledger, coupons, referrals                                  */
/* ------------------------------------------------------------------ */

function rewardsKey(userId: string): string {
  return `${KEY.rewards}:${userId}`;
}

export function getRewards(userId: string): RewardsState {
  return read<RewardsState>(rewardsKey(userId), { transactions: [], coupons: [], referrals: [], discoveredCuisines: [] });
}

export function saveRewards(userId: string, state: RewardsState) {
  write(rewardsKey(userId), state);
  emit('rewards');
}

export function useRewards(userId: string): RewardsState {
  return useStoreValue<RewardsState>(
    'rewards',
    useCallback(() => getRewards(userId), [userId]),
  );
}

export function tokenBalance(userId: string): number {
  return getRewards(userId).transactions.reduce((sum, t) => sum + t.delta, 0);
}

/**
 * Demo-only: wipe a user's wallet back to the seeded starting balance.
 * Never callable for non-demo accounts (enforced by the caller).
 */
export function resetDemoRewards(userId: string) {
  write(rewardsKey(userId), { transactions: [], coupons: [], referrals: [], discoveredCuisines: [] });
  emit('rewards');
}

/* ------------------------------------------------------------------ */
/* Recommendation-attribute suggestions (restaurant admin proposes,
 * executive approves — nothing suggested is ever live without approval) */
/* ------------------------------------------------------------------ */

export function getSuggestions(): IntelligenceSuggestion[] {
  return read<IntelligenceSuggestion[]>(KEY.suggestions, []);
}

export function useSuggestions(): IntelligenceSuggestion[] {
  return useStoreValue<IntelligenceSuggestion[]>('suggestions', getSuggestions);
}

export function saveSuggestions(suggestions: IntelligenceSuggestion[]) {
  write(KEY.suggestions, suggestions);
  emit('suggestions');
}

export function upsertSuggestion(suggestion: IntelligenceSuggestion) {
  const all = getSuggestions();
  const idx = all.findIndex((s) => s.id === suggestion.id);
  if (idx >= 0) all[idx] = suggestion;
  else all.push(suggestion);
  saveSuggestions(all);
}

export function resolveSuggestion(id: string, status: 'approved' | 'rejected') {
  const all = getSuggestions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], status, resolvedAt: new Date().toISOString() };
  saveSuggestions(all);
}

export function deleteSuggestion(id: string) {
  saveSuggestions(getSuggestions().filter((s) => s.id !== id));
}

/* ------------------------------------------------------------------ */
/* Moderation flags (executive)                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Restaurant profile drafts (admin edit → executive approval)          */
/* ------------------------------------------------------------------ */

const KEY_DRAFT = 'khabo-kothay:demo:restaurant-drafts';

export function getRestaurantDrafts(): RestaurantDraft[] {
  return read<RestaurantDraft[]>(KEY_DRAFT, []);
}

export function useRestaurantDrafts(): RestaurantDraft[] {
  return useStoreValue<RestaurantDraft[]>('drafts', getRestaurantDrafts);
}

export function saveRestaurantDrafts(drafts: RestaurantDraft[]) {
  write(KEY_DRAFT, drafts);
  emit('drafts');
}

export function getRestaurantDraft(restaurantId: string): RestaurantDraft | undefined {
  return getRestaurantDrafts().find((d) => d.restaurantId === restaurantId);
}

export function upsertRestaurantDraft(draft: RestaurantDraft) {
  const all = getRestaurantDrafts();
  const idx = all.findIndex((d) => d.restaurantId === draft.restaurantId);
  if (idx >= 0) all[idx] = draft;
  else all.push(draft);
  saveRestaurantDrafts(all);
}

export interface FlagEntry {
  id: string;
  targetType: 'restaurant' | 'review' | 'offer' | 'user';
  targetId: string;
  reason: string;
  status: 'pending' | 'resolved';
  at: string;
}

export function getFlags(): FlagEntry[] {
  return read<FlagEntry[]>(KEY.flagged, []);
}

export function useFlags(): FlagEntry[] {
  return useStoreValue<FlagEntry[]>('flagged', getFlags);
}

export function saveFlags(flags: FlagEntry[]) {
  write(KEY.flagged, flags);
  emit('flagged');
}

export function upsertFlag(flag: FlagEntry) {
  const all = getFlags();
  const idx = all.findIndex((f) => f.id === flag.id);
  if (idx >= 0) all[idx] = flag;
  else all.push(flag);
  saveFlags(all);
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// Re-exported so existing consumers keep their import path while the
// implementation lives in lib (components must not import the store for a
// pure utility).
export { uid } from '../lib/uid';

export function useNowKey(): number {
  const [, setTick] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    ref.current = Date.now();
    setTick(ref.current);
  }, []);
  return ref.current;
}
