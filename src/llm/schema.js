import { z } from "zod";

export const EventDetailsSchema = z.object({
    text: z.string().describe("One-line summary of the event"),
    dates: z.string().describe("Event start and finish times in RFC 5545 format (e.g., '20210108T170000Z/20210108T190000Z')"),
    details: z.string().optional().default("").describe("Longer event description"),
    location: z.string().optional().default("").describe("Intended venue for the activity"),
    recur: z.string().optional().default("").describe("Recurrence pattern as RFC5545 RRULE (must start with 'RRULE:' prefix)")
});
