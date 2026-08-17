import type { RewardDefinition } from '../domain/rewards';

/**
 * Demo reward catalogue. These are believable demo offers for participating
 * restaurants — they are NOT guaranteed discounts and are never redeemable in
 * real restaurants. The definitions are data so a real offers backend can
 * replace them later without touching the wallet UI.
 */
export const REWARD_CATALOGUE: RewardDefinition[] = [
  {
    id: 'welcome',
    title: '৳50 OFF',
    value: '৳50 OFF',
    cost: 40,
    minBill: '৳299',
    applicable: 'Participating restaurants',
    validDays: 30,
    description: 'Get ৳50 off your next eligible restaurant bill.',
    codePrefix: 'KK50',
    tag: 'First reward',
  },
  {
    id: 'biryani',
    title: '৳100 OFF Biryani',
    value: '৳100 OFF',
    cost: 80,
    minBill: '৳499',
    applicable: 'Participating biryani restaurants',
    validDays: 30,
    description: 'Save ৳100 when dining at participating biryani restaurants.',
    codePrefix: 'KK100B',
    tag: 'Biryani',
  },
  {
    id: 'cafe',
    title: 'Free Beverage',
    value: 'Free drink',
    cost: 60,
    minBill: '৳399',
    applicable: 'Participating cafés',
    validDays: 30,
    description: 'Get one complimentary eligible beverage at participating cafés.',
    codePrefix: 'KKFREE',
    tag: 'Café',
  },
  {
    id: 'date',
    title: '৳150 OFF',
    value: '৳150 OFF',
    cost: 100,
    minBill: '৳999',
    applicable: 'Participating date-night restaurants',
    validDays: 30,
    description: 'Save ৳150 on an eligible date-night meal.',
    codePrefix: 'KK150',
    tag: 'Date night',
  },
  {
    id: 'family',
    title: '৳200 OFF',
    value: '৳200 OFF',
    cost: 150,
    minBill: '৳1,499',
    applicable: 'Participating family-friendly restaurants',
    validDays: 30,
    description: 'Save ৳200 on an eligible family dining bill.',
    codePrefix: 'KK200',
    tag: 'Family dining',
  },
];

export function getRewardDefinition(id: string): RewardDefinition | undefined {
  return REWARD_CATALOGUE.find((r) => r.id === id);
}
