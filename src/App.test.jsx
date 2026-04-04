import { describe, expect, it } from "vitest";
import { AUTO_RULE_IDS, computeAutoCompliance, computeCompliance, deriveSchedule, FAIL, fmt12, MANUAL_RULE_IDS, minsUntil, PASS, PENDING, pruneLogs, RULES, toMins, toTime } from "./App.jsx";

describe("toMins", () => {
  it("converts HH:MM to minutes since midnight", () => {
    expect(toMins("00:00")).toBe(0);
    expect(toMins("06:30")).toBe(390);
    expect(toMins("22:30")).toBe(1350);
    expect(toMins("23:59")).toBe(1439);
  });

  it("returns 0 for falsy input", () => {
    expect(toMins("")).toBe(0);
    expect(toMins(null)).toBe(0);
    expect(toMins(undefined)).toBe(0);
  });
});

describe("toTime", () => {
  it("converts minutes to HH:MM", () => {
    expect(toTime(0)).toBe("00:00");
    expect(toTime(390)).toBe("06:30");
    expect(toTime(1350)).toBe("22:30");
  });

  it("wraps around midnight", () => {
    expect(toTime(1440)).toBe("00:00");
    expect(toTime(1500)).toBe("01:00");
    expect(toTime(-60)).toBe("23:00");
  });
});

describe("fmt12", () => {
  it("formats HH:MM as 12-hour time", () => {
    expect(fmt12("06:30")).toBe("6:30 AM");
    expect(fmt12("12:00")).toBe("12:00 PM");
    expect(fmt12("22:30")).toBe("10:30 PM");
    expect(fmt12("00:00")).toBe("12:00 AM");
  });

  it("returns empty string for falsy input", () => {
    expect(fmt12("")).toBe("");
    expect(fmt12(null)).toBe("");
  });
});

describe("minsUntil", () => {
  it("calculates minutes between two times", () => {
    expect(minsUntil("22:30", "20:00")).toBe(150);
    expect(minsUntil("06:30", "06:00")).toBe(30);
  });

  it("wraps around midnight", () => {
    expect(minsUntil("01:00", "23:00")).toBe(120);
  });
});

describe("deriveSchedule", () => {
  const plan = { wakeTime: "06:30", bedTime: "22:30" };
  const sched = deriveSchedule(plan);

  it("calculates caffeine cutoff as 10 hours before bed", () => {
    expect(sched.caffeineCutoff).toBe("12:30");
  });

  it("calculates alcohol cutoff as 3 hours before bed", () => {
    expect(sched.alcoholCutoff).toBe("19:30");
  });

  it("calculates meal cutoff as 2.5 hours before bed", () => {
    expect(sched.mealCutoff).toBe("20:00");
  });

  it("calculates screens cutoff as 1 hour before bed", () => {
    expect(sched.screensCutoff).toBe("21:30");
  });

  it("calculates morning light end as 1 hour after wake", () => {
    expect(sched.morningLightEnd).toBe("07:30");
  });
});

describe("computeAutoCompliance", () => {
  const plan = { wakeTime: "06:30", bedTime: "22:30" };

  it("returns all pending for empty events", () => {
    const result = computeAutoCompliance(plan, []);
    expect(result.R.r1).toBe(PENDING);
    expect(result.R.r2).toBe(PENDING);
  });

  it("passes rule 1 when wake time is within 30 min", () => {
    const events = [{ type: "wake", time: "06:45" }];
    expect(computeAutoCompliance(plan, events).R.r1).toBe(PASS);
  });

  it("fails rule 1 when wake time is outside 30 min", () => {
    const events = [{ type: "wake", time: "08:00" }];
    expect(computeAutoCompliance(plan, events).R.r1).toBe(FAIL);
  });

  it("passes rule 19 when no coffee logged", () => {
    expect(computeAutoCompliance(plan, []).R.r19).toBe(PASS);
  });

  it("passes rule 19 when coffee is before cutoff", () => {
    const events = [{ type: "coffee", time: "10:00" }];
    expect(computeAutoCompliance(plan, events).R.r19).toBe(PASS);
  });

  it("fails rule 19 when coffee is after cutoff", () => {
    const events = [{ type: "coffee", time: "15:00" }];
    expect(computeAutoCompliance(plan, events).R.r19).toBe(FAIL);
  });

  it("fails rule 9 when nap is after 3 PM", () => {
    const events = [{ type: "nap", time: "16:00" }];
    expect(computeAutoCompliance(plan, events).R.r9).toBe(FAIL);
  });

  it("passes rule 9 when nap is before 3 PM", () => {
    const events = [{ type: "nap", time: "13:00" }];
    expect(computeAutoCompliance(plan, events).R.r9).toBe(PASS);
  });

  it("counts passed and failed correctly", () => {
    const events = [
      { type: "wake", time: "06:30" },
      { type: "morning_light", time: "07:00" },
      { type: "coffee", time: "15:00" },
    ];
    const result = computeAutoCompliance(plan, events);
    expect(result.passed).toBeGreaterThan(0);
    expect(result.failed).toBeGreaterThan(0);
  });
});

describe("computeCompliance", () => {
  const plan = { wakeTime: "06:30", bedTime: "22:30" };

  it("includes manual rules", () => {
    const manual = { r4: true, r5: false };
    const result = computeCompliance(plan, [], manual);
    expect(result.R.r4).toBe(PASS);
    expect(result.R.r5).toBe(PENDING);
  });

  it("sums to 29 rules total", () => {
    const result = computeCompliance(plan, [], {});
    const total = result.passed + result.failed + result.pending;
    expect(total).toBe(29);
  });
});

describe("pruneLogs", () => {
  it("keeps recent entries", () => {
    const today = new Date().toISOString().slice(0, 10);
    const logs = { [today]: [{ type: "wake", time: "06:30" }] };
    expect(pruneLogs(logs)).toEqual(logs);
  });

  it("removes entries older than 90 days", () => {
    const old = new Date();
    old.setDate(old.getDate() - 100);
    const oldKey = old.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const logs = {
      [oldKey]: [{ type: "wake", time: "06:30" }],
      [today]: [{ type: "wake", time: "07:00" }],
    };
    const pruned = pruneLogs(logs);
    expect(pruned[oldKey]).toBeUndefined();
    expect(pruned[today]).toBeDefined();
  });
});

describe("RULES integrity", () => {
  it("has 29 rules", () => {
    expect(RULES).toHaveLength(29);
  });

  it("AUTO_RULE_IDS and MANUAL_RULE_IDS cover all 29", () => {
    expect(AUTO_RULE_IDS.length + MANUAL_RULE_IDS.length).toBe(29);
    const all = [...AUTO_RULE_IDS, ...MANUAL_RULE_IDS].sort((a, b) => a - b);
    expect(all).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });
});
