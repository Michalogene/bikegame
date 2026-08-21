// @ts-check

/**
 * Choose the safest candidate while still respecting distance from the death point.
 * @param {{ id: string, x: number, z: number, rotation: number, label?: string, blocked: boolean, outdoor: boolean, deathDistance: number, enemyDistance: number }[]} candidates
 * @param {{ minimumDeathDistance?: number, minimumEnemyDistance?: number, lastSpawnId?: string | null }} [options]
 */
export function selectRespawnCandidate(candidates, options = {}) {
  const minimumDeathDistance = options.minimumDeathDistance ?? 22;
  const minimumEnemyDistance = options.minimumEnemyDistance ?? 12;
  const traversable = candidates.filter((candidate) => !candidate.blocked && candidate.outdoor);
  if (!traversable.length) return null;
  const contactSafe = traversable.filter((candidate) => candidate.enemyDistance >= 5.5);
  const valid = contactSafe.length ? contactSafe : traversable;
  const preferred = valid.filter((candidate) => (
    candidate.deathDistance >= minimumDeathDistance
    && candidate.enemyDistance >= minimumEnemyDistance
  ));
  const pool = preferred.length ? preferred : valid;
  let bestCandidate = null;
  let bestScore = -Infinity;
  for (const candidate of pool) {
    const repeatedPenalty = candidate.id === options.lastSpawnId ? 32 : 0;
    const proximityPenalty = candidate.deathDistance < minimumDeathDistance
      ? (minimumDeathDistance - candidate.deathDistance) * 2.4
      : 0;
    const score = Math.min(candidate.enemyDistance, 80) * 2.1
      + Math.min(candidate.deathDistance, 120) * 0.55
      - repeatedPenalty
      - proximityPenalty;
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }
  return bestCandidate;
}
