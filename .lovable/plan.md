# Homepage onboarding

## Goal
Make the selected track lead immediately into a suitable challenge while keeping SparkCoder’s dark arcade style and existing progress intact.

## Changes
- Put a prominent track-aware start button directly beneath the introduction, plus an “Explore learning paths” action that scrolls to the learning choices.
- For new learners, open the first unlocked beginner puzzle in the selected track.
- For returning learners, derive the most recently completed still-available puzzle from saved progress, label the action “Continue practising,” and resume at the next suitable puzzle in that module.
- Extend practice-page links with an optional challenge target so the chosen puzzle opens directly without changing existing task IDs or saved progress.
- Reorder the homepage choices into: Learn the concepts → Guided puzzles → Live coding → Interview preparation. Use only destinations that already exist for each selected track, omitting unavailable stages.
- Move homepage XP, streak, solved progress, rank, and badges below the starting actions; keep the top bar compact on the homepage so the primary action remains visible early.
- Preserve the existing extra resources and module browser beneath the new onboarding flow.

## Verification
- Check every track’s button label and destination with empty and saved progress.
- Confirm the learning sequence only shows available features.
- Check the first screen at common mobile and desktop sizes and verify track switching updates immediately.
- Confirm direct challenge links, completion, refresh, and existing saved progress still work.
