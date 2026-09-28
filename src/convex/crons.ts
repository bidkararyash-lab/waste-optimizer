import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Hourly alert sweep; daily dedupe keys keep alert creation to once per day
// per batch/item (PRD ALR-1..3). Idempotent and safe to run twice.
crons.interval(
  "alert sweep",
  { hours: 1 },
  internal.alerts.cronSweep,
  {},
);

export default crons;
