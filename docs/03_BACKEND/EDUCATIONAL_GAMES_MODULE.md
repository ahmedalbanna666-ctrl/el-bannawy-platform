# Educational Games Module

Version: 2.0.0
Status: Web client feature baseline

## Current Games

The web client currently provides a games hub, listening challenge, and pronunciation challenge. Supporting code includes a question engine, game settings/types, game data hook, unit-map selection, and browser speech-recognition integration.

## Learning Rules

- Games are supplementary practice and do not unlock lessons or replace assessments.
- Pronunciation challenge depends on browser speech-recognition availability; unsupported browsers must show a usable fallback/error state (implemented: word + translation are shown and the learner can skip each word without scoring; skipped words are counted separately on the result screen).
- Listening challenge uses lesson/content data available to the client. When speech synthesis is unavailable the current word is displayed as text so the challenge remains playable.
- Game rewards and persistence must not be documented as active unless backed by a backend endpoint and schema relation.

## Current Routes

- `/dashboard/games`
- `/dashboard/games/listening-challenge`
- `/dashboard/games/pronunciation-challenge`
- `/dashboard/games/memory`
- `/dashboard/teacher/games`

## Teacher Management

The `/dashboard/teacher/games` page manages the three client games:

- Listening challenge: enable/disable, replay limit, questions per round.
- Pronunciation challenge: enable/disable, success threshold, questions per round, XP and coin rewards.
- Memory game: enable/disable, word pairs per round.

Game settings are stored per game in a single `systemSetting` row keyed `game_settings` and are served from `GET /games/settings`. Students see disabled games as locked on the games hub and cannot open them.

## Current Limitations

There is no dedicated backend games module or game-attempt schema in the current API. Persisted game analytics, configurable XP limits, multiplayer, and game leaderboards are planned. Existing XP/achievement features are separate from the client challenge implementation. XP/coin rewards displayed by the pronunciation challenge are client-side only and not yet persisted.

End of Document.
