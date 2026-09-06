/**
 * Pure deadline logic for group entries, shared by the group dashboard and
 * covered directly by unit tests.
 *
 * A group is "closed" once the tournament's registration deadline has passed
 * (deadlines are inclusive of the whole day), and "urgent" while there is less
 * than 48 hours left AND at least one slot still has no player name.
 */

export const URGENT_WINDOW_MS = 48 * 60 * 60 * 1000;

export type GroupDeadlineState = {
  deadline: Date | null;
  msLeft: number | null;
  closed: boolean;
  urgent: boolean;
  unnamed: number;
};

export function getGroupDeadlineState({
  registrationDeadline,
  playerNames,
  now = Date.now(),
}: {
  registrationDeadline: string | null | undefined;
  playerNames: string[];
  now?: number;
}): GroupDeadlineState {
  const deadline = registrationDeadline ? new Date(`${registrationDeadline}T23:59:59`) : null;
  const msLeft = deadline ? deadline.getTime() - now : null;
  const closed = msLeft !== null && msLeft < 0;
  const unnamed = playerNames.filter((n) => !n.trim()).length;
  const urgent = msLeft !== null && msLeft > 0 && msLeft < URGENT_WINDOW_MS && unnamed > 0;
  return { deadline, msLeft, closed, urgent, unnamed };
}
