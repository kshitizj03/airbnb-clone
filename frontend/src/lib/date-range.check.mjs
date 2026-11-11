import assert from "node:assert/strict";
import { parseISO } from "date-fns";
import { canSelectRange, isDayDisabled, nextRange } from "./date-range.ts";

const d = (s) => parseISO(s);
const booked = [[d("2026-12-10"), d("2026-12-14")]]; // nights 10, 11, 12, 13 taken
const min = d("2026-12-01");

assert.equal(isDayDisabled(d("2026-11-30"), {}, booked, min), true, "past day");
assert.equal(isDayDisabled(d("2026-12-12"), {}, booked, min), true, "booked night");
assert.equal(isDayDisabled(d("2026-12-14"), {}, booked, min), false, "booked range's check_out day is free");
assert.equal(isDayDisabled(d("2026-12-10"), {}, booked, min), true, "booked check_in day is not a valid check-in");
assert.equal(isDayDisabled(d("2026-12-10"), { from: d("2026-12-08") }, booked, min), false, "but is a valid checkout");
assert.equal(isDayDisabled(d("2026-12-11"), { from: d("2026-12-08") }, booked, min), true, "crossing a booked night");
assert.equal(isDayDisabled(d("2026-12-20"), { from: d("2026-12-08") }, booked, min), true, "beyond the booked block");
assert.equal(canSelectRange(d("2026-12-14"), d("2026-12-16"), booked), true);
assert.equal(canSelectRange(d("2026-12-08"), d("2026-12-08"), booked), false, "zero nights");

const first = nextRange(d("2026-12-03"), {}, booked, min);
assert.deepEqual(first, { from: d("2026-12-03") });
assert.deepEqual(nextRange(d("2026-12-05"), first, booked, min), { from: d("2026-12-03"), to: d("2026-12-05") });
assert.deepEqual(nextRange(d("2026-12-02"), first, booked, min), { from: d("2026-12-02") }, "earlier click restarts");
assert.deepEqual(nextRange(d("2026-12-20"), first, booked, min), first, "disabled click is ignored");
console.log("date-range checks passed");
