import { Word } from '../types';

// Share of the weekly batch that should come from each frequency tier
// (1 = most common words, 5 = rarest). Sums to 1.
const TIER_SHARE: Record<number, number> = { 1: 0.4, 2: 0.3, 3: 0.15, 4: 0.1, 5: 0.05 };

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Splits `goal` across tiers 1-5 by TIER_SHARE so the counts always sum to
 * exactly `goal` (largest-remainder method) — independent per-tier rounding
 * can overshoot goal, which would otherwise force an end truncation that
 * systematically drops the later (rarer) tiers every time.
 */
function tierTargets(goal: number): Record<number, number> {
  const tiers = [1, 2, 3, 4, 5];
  const exact = tiers.map((tier) => goal * TIER_SHARE[tier]);
  const targets = exact.map(Math.floor);
  let remaining = goal - targets.reduce((sum, n) => sum + n, 0);

  const remainderOrder = tiers
    .map((tier, i) => ({ tier, remainder: exact[i] - targets[i] }))
    .sort((a, b) => b.remainder - a.remainder);

  for (let i = 0; i < remainderOrder.length && remaining > 0; i++, remaining--) {
    targets[tiers.indexOf(remainderOrder[i].tier)] += 1;
  }

  return Object.fromEntries(tiers.map((tier, i) => [tier, targets[i]]));
}

/**
 * Picks up to `goal` words from `pool`, aiming for the TIER_SHARE distribution
 * across frequency tiers. If a tier doesn't have enough candidates, the
 * shortfall is backfilled from whatever tier has words left, so the batch
 * still reaches `goal` whenever the pool overall is large enough.
 */
export function pickWeightedBatch(pool: Word[], goal: number): Word[] {
  const byTier: Record<number, Word[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const word of pool) {
    (byTier[word.frequencyScore] ?? byTier[3]).push(word);
  }
  for (const tier of Object.keys(byTier)) {
    byTier[Number(tier)] = shuffle(byTier[Number(tier)]);
  }

  const targets = tierTargets(goal);
  const selected: Word[] = [];
  const leftover: Word[] = [];
  for (const tier of [1, 2, 3, 4, 5]) {
    const take = Math.min(targets[tier], byTier[tier].length);
    selected.push(...byTier[tier].slice(0, take));
    leftover.push(...byTier[tier].slice(take));
  }

  for (const word of shuffle(leftover)) {
    if (selected.length >= goal) break;
    selected.push(word);
  }

  return selected;
}
