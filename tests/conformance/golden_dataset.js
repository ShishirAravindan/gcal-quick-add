export const GOLDEN_DATASET = [
    // --- HAPPY PATH ---
    {
        name: "Simple Standard",
        input: "Team sync tomorrow at 2pm for 1 hour",
        expected: {
            text: /Team sync/i,
            dates: /T140000\/.*T150000/
        }
    },
    // --- TEMPORAL LOGIC ---
    {
        name: "Crosses Midnight",
        input: "Late night coding session from 11pm tonight until 2am",
        expected: {
            text: /Coding/i,
            // Check that the end date is actually the day AFTER the start date
            custom: (res) => {
                const [start, end] = res.dates.split('/');
                return start.substring(0, 8) !== end.substring(0, 8);
            }
        }
    },
    {
        name: "Relative Duration Math",
        input: "Quick call in 20 minutes for 15 mins",
        expected: {
            text: /call/i,
            custom: (res) => {
                const [start, end] = res.dates.split('/');
                // This is hard to regex, we just verify it exists and is formatted
                return start.includes('T') && end.includes('T');
            }
        }
    },
    // --- COMPLEX RECURRENCE ---
    {
        name: "Ordinal Recurrence",
        input: "Board meeting every last Friday of the month at 4pm",
        expected: {
            recur: /RRULE:.*BYDAY=-1FR/
        }
    },
    // --- NOISY / HUMAN ---
    {
        name: "Self-Correction",
        input: "Let's grab coffee at 2pm... actually let's make it 3:30pm at Blue Bottle",
        expected: {
            text: /coffee/i,
            dates: /T153000/,
            location: /Blue Bottle/i
        }
    },
    {
        name: "Natural Language Mess",
        input: "Subject: Lunch? Hey, just checking if you want to grab a bite at 12:30 on Tuesday at Mario's Pizza. Let me know!",
        expected: {
            text: /Lunch/i,
            location: /Mario's Pizza/i,
            dates: /T123000/
        }
    },
    // --- NEGATIVE / AMBIGUOUS ---
    {
        name: "Ambiguous Date (US vs Intl)",
        input: "Flight on 10/12 at 8am",
        expected: {
            // This tests if the model uses the provided "Current Date" to disambiguate 
            // We expect it to be smart, but we'll accept either as long as it's formatted
            dates: /T080000/
        }
    },
    {
        name: "Non-Event / Refusal",
        input: "Remind me to buy eggs tomorrow",
        expected: {
            // Model should ideally realize this is a task, not a calendar event with a time,
            // but usually it will just make a 12pm event. We test for formatting integrity.
            text: /buy eggs/i
        }
    }
];
