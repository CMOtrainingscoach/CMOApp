/** Calendar day bounds consistent with {@link ../utils.todayIso}: local Y-M-D midnight → exclusive next midnight (ISO timestamps). */
export function localMidnightBoundsIso(missionDateYmd: string): {
  startIso: string;
  endExclusiveIso: string;
} {
  const [yStr, moStr, dStr] = missionDateYmd.split("-");
  const y = Number(yStr);
  const mo = Number(moStr);
  const d = Number(dStr);
  const start = new Date(y, mo - 1, d, 0, 0, 0, 0);
  const endExclusive = new Date(y, mo - 1, d + 1, 0, 0, 0, 0);
  return {
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString(),
  };
}
