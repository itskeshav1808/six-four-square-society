import { describe, expect, it } from "vitest";
import { getGroupDeadlineState, URGENT_WINDOW_MS } from "@/lib/group-deadline";

const DAY = 24 * 60 * 60 * 1000;
// Deadlines are inclusive of the whole day, so a deadline date resolves to 23:59:59.
const deadlineEnd = (date: string) => new Date(`${date}T23:59:59`).getTime();

describe("group deadline warnings", () => {
  it("shows no warning when the deadline is comfortably far away", () => {
    const s = getGroupDeadlineState({
      registrationDeadline: "2026-10-01",
      playerNames: ["", "", "Asha", "", ""],
      now: deadlineEnd("2026-10-01") - 10 * DAY,
    });
    expect(s.closed).toBe(false);
    expect(s.urgent).toBe(false);
    expect(s.unnamed).toBe(4);
  });

  it("warns urgently inside the 48 hour window while slots are unnamed", () => {
    const s = getGroupDeadlineState({
      registrationDeadline: "2026-10-01",
      playerNames: ["Asha", "", "Ravi", "  ", "Neel"],
      now: deadlineEnd("2026-10-01") - (URGENT_WINDOW_MS - 60_000),
    });
    expect(s.urgent).toBe(true);
    expect(s.closed).toBe(false);
    expect(s.unnamed).toBe(2);
  });

  it("does not warn inside 48 hours once every slot has a name", () => {
    const s = getGroupDeadlineState({
      registrationDeadline: "2026-10-01",
      playerNames: ["Asha", "Ravi", "Neel", "Meera", "Kabir"],
      now: deadlineEnd("2026-10-01") - 3 * 60 * 60 * 1000,
    });
    expect(s.urgent).toBe(false);
    expect(s.unnamed).toBe(0);
  });

  it("marks the group closed after the deadline day ends", () => {
    const s = getGroupDeadlineState({
      registrationDeadline: "2026-10-01",
      playerNames: ["Asha", ""],
      now: deadlineEnd("2026-10-01") + 1000,
    });
    expect(s.closed).toBe(true);
    expect(s.urgent).toBe(false);
  });

  it("is still open late on the deadline day itself", () => {
    const s = getGroupDeadlineState({
      registrationDeadline: "2026-10-01",
      playerNames: ["Asha"],
      now: new Date("2026-10-01T22:00:00").getTime(),
    });
    expect(s.closed).toBe(false);
  });

  it("treats a tournament with no deadline as always open and never urgent", () => {
    const s = getGroupDeadlineState({ registrationDeadline: null, playerNames: ["", ""] });
    expect(s.deadline).toBeNull();
    expect(s.msLeft).toBeNull();
    expect(s.closed).toBe(false);
    expect(s.urgent).toBe(false);
  });
});
