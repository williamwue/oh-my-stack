# Sentence style and examples

Use these guidelines when a longer document needs a detailed prose review.
Prefer the project style when a convention differs. Sentence-length targets
are review aids; preserve clarity when a longer sentence works better.

## Write sentences to the reader (Google developer style)

- Talk to the reader as "you", in the present tense. "Will" only for things that genuinely happen later.
- Say who does what: "the compiler checks", not "is checked". Passive is fine only when the actor is unknown or beside the point.
- Write instructions as commands: "Click Submit." State facts plainly. Never "should be done".
- Put the condition before the instruction: "To delete the document, click Delete." The reader skips what does not apply.
- Put the common case first. Exceptions after.
- Sound like a knowledgeable friend. No buzzwords, no figurative language, no "please" in instructions, and never "simply", "easy", or "quickly" in a procedure. If it were simple, the reader would not be here.
- Don't pre-announce ("we will soon support...") and don't start consecutive sentences with the same phrase.
- Link with words that say where the link goes: the page title or a short description. Never "click here". Prefer a sentence of context on the page over a link off it.
- Headings carry the point, not just the topic ("Pick the mode first", not "Modes"). Sentence case. A task heading is a bare verb phrase ("Create an instance"). A concept heading is a noun phrase. One h1 per page, no skipped levels.
- Numbered lists for sequences, bullets for everything else. Introduce a list with a complete sentence. Keep items parallel.
- Code goes in code font. UI elements go in bold. Use serial commas. Drop "etc." and say up front that a list is partial.

Source: developers.google.com/style, fetched 2026-07-18.

## Make statements load one at a time (STE rules)

- One instruction per sentence. One thought per sentence everywhere else.
- Split instructions longer than about 20 words and other sentences longer than about 25.
- Put the warning or condition before the step it guards: "If hot oil touches your skin, injuries can occur."
- Keep "the" and "a": "Remove backup file" reads two ways. "Remove the backup file" reads one.
- Give each word one meaning and one job, then keep it. If "check" means inspect, don't also use it for restrain.
- Pick one word per action and stick to it: "start", not "start" here and "initiate" there.
- Write procedures as direct commands, never as narration and never in the passive: "Install the component", not "the component must be installed".
- Avoid "-ing" words where you can. They take too many grammatical jobs and breed misreadings.

Source: asd-ste100.org (Issue 9, 2025), fetched 2026-07-18. The numbered rules and dictionary live in the spec PDF. The principles above are the transferable core.

## Leave no sentence open to two readings (Global English)

- Keep words like "only" and "not" next to the word they change: "only fails on growth" and "fails only on growth" say different things.
- Break up long noun strings: "the proto import budget check script" becomes "the script that checks the proto-import budget".
- Make every "it", "they", and "this" point at one obvious thing. Repeat the noun when in doubt. Never use "this" or "which" to point at a whole clause.
- Don't drop verbs: "Phase 1 moves the converters and Phase 2 the runtime" leaves Phase 2 without one. Give it one.
- Keep the small words that show structure. "Ensure that the switch is off" keeps "that" because it makes the sentence parse one way. Never trade clarity for word count.
- Repeat the article in a series when it prevents a misread: "the client and the host", not "the client and host", when they are two things.
- Say which parts "and" or "or" joins when a sentence can group two ways. "Both...and", "either...or", and "if...then" are free disambiguators.
- Use periods, not semicolons. Replace an em dash with a new sentence.
- Make text in parentheses a full grammatical unit or its own sentence. Never form plurals with "(s)".
- No slashes: write "a, b, or both" instead of "a/b" or "and/or".
- Call each thing by one name, everywhere. A doc that says "the gate", "the ratchet", and "the budget check" for one thing teaches three things. Rewording an unchanged sentence between edits costs the same way. Don't churn what didn't change.
- Skip idioms, colloquialisms, Latin abbreviations, and metaphors. A non-native reader, a translator, and an agent all parse plain constructions best.

Source: Kohl, The Global English Style Guide (SAS Press). Guideline text fetched from the Internet Archive and the SAS sample chapter, 2026-07-18.

## Worked example

Before:

> Configuration of the proto import ratchet budget script parameters is performed via budget.json. Note that it's important to remember that running with --write, which updates the committed budget to reflect the current count, should only be done when lowering it. If exceeded, CI fails.

After:

> `budget.mjs` reads the committed budget from `budget.json` and counts the files that import protos. If the count exceeds the budget, CI fails. Run `budget.mjs --write` only to lower the budget.

## Review checklist

Apply to any prose this skill covers. Item 1 applies only to document sets:

1. Is each file one Diátaxis mode, with links where modes meet?
2. Is every instruction written as a command, with its condition in front?
3. Does any sentence carry two instructions or two thoughts? Split it.
4. Can any word be cut without losing meaning? Cut it.
5. Is "only" next to the word it changes? Does every "it" point at one thing? Does every clause keep its verb?
6. Does each thing have exactly one name across the docs?
7. Would a developer say these words out loud? Replace invented metaphors and fancy synonyms with the plain word or the real symbol name.
8. Are all symbols, paths, and counts real at this commit, with the commands that regenerate the counts?
