## What changed

<!-- One or two sentences. What does this do, and why now? -->

## How it was verified

<!-- What did you actually run or click? "Typecheck passes" is not verification
     of behaviour. Name the flow you exercised and what you saw. -->

- [ ] `npx tsc --noEmit` passes
- [ ] Exercised the affected flow locally or on a preview deployment

## Risk

<!-- Delete the lines that do not apply. -->

- [ ] Changes an API response shape consumed by the frontend
- [ ] Changes who can read or write data (roles, auth, Firestore access)
- [ ] Changes outbound email or anything customer-facing
- [ ] Requires new environment variables (list them, and confirm they are set in Vercel)
- [ ] Requires a data migration or backfill

## Secrets

- [ ] No credentials, tokens, private keys, or `.env` files are included in this diff

<!-- Reminder: `git add -f` bypasses .gitignore. If you had to force-add a file,
     say why here. -->
