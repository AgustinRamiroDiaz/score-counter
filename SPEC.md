# Score Counter — Product Specification

## Overview

Score Counter is a mobile-first web application for tracking scores in round-based games. Users configure a roster of players, then record each round's points. The app doubles as a voice/chat-driven assistant: every scoring action reachable by tapping is equally reachable by speaking or typing in the chat panel.

There is no backend. All data lives in the browser.

---

## Core Concepts

| Term | Definition |
|------|-----------|
| **Game** | A named session with a fixed player roster. |
| **Player** | A participant with a primary name and zero or more aliases (e.g. "Alex", "Al", "Big Al"). Aliases are used by the AI to resolve ambiguous references in chat. |
| **Round** | One scoring period within a game. A round is only recorded once **all** players' scores have been provided together, ensuring the dataset is always complete and consistent. |
| **Score entry** | A numeric value assigned to a player for a specific round. A round's score set is atomic: it is committed as a whole or not at all. |

---

## User Flows

### 1. New Game Setup

1. User opens the app → lands on the **Home** screen.
2. Taps **New Game** → enters a game name.
3. Adds players one by one: required primary name, optional aliases (comma-separated).
4. Player list shows inline with edit / remove actions.
5. Taps **Start Game** → navigates to the **Scoring** screen.

**Constraints**
- Minimum 2 players to start.
- Player names must be unique within the game (case-insensitive).
- Aliases must not collide with any other player's name or alias.

### 2. Round Scoring

1. On the **Scoring** screen, a **Score Round** button (or FAB) opens a bottom sheet.
2. The sheet shows one numeric input per player, pre-focused on the first field.
3. All fields must be filled before confirming — the **Confirm** button is disabled until every player has a value.
4. User confirms → all scores are committed together as a single round; sheet closes.
5. Inline edit: tapping a past round in the table opens the same sheet pre-filled with all players' scores for correction. Saving overwrites the entire round atomically.

**Consistency rule**: partial rounds are never persisted. The app has no concept of an "open" or "in-progress" round — a round either contains a score for every player or it does not exist yet.

### 3. Leaderboard View

- Sorted by cumulative score descending.
- Shows rank, player name, total points, and delta from the leader.
- Ties share the same rank.
- Updates in real time as scores are entered.

### 4. Round Chart View

- Line chart with one series per player.
- X-axis: round number. Y-axis: cumulative score at that round.
- Tap a data point to see the exact score for that round.
- Toggle individual players on/off via a legend.

### 5. Points Table View

- Grid: rows = players, columns = rounds + total.
- Pinned first column (player name), pinned last column (total).
- Horizontally scrollable on mobile.
- Tap a cell to edit that round's entry.

### 6. Chat Interface

A persistent bottom drawer (collapsible) or a dedicated tab on mobile. Provides a text input and a conversation history list.

The user interacts in natural language. The AI resolves intent, calls one or more **scoring tools**, and responds with a confirmation.

**Example interactions**

| User says | Action |
|-----------|--------|
| "Alex got 10, Maria got 5, Tomás got -3" | `add_round({ scores: { Alex: 10, Maria: 5, Tomás: -3 } })` |
| "Record this round: 10, 5, -3" (3-player game) | AI maps values to players in roster order, then calls `add_round` |
| "Who's winning?" | `get_leaderboard()` → rendered inline |
| "Undo the last round" | `undo_last_round()` |
| "Show me the chart" | `navigate({ view: "chart" })` |
| "Rename BigAl to Alex" | `update_player({ target: "BigAl", name: "Alex" })` |

If the user provides scores for only a subset of players, the AI asks for the missing players' scores before calling `add_round`. Partial rounds are never committed.

Unrecognized or ambiguous input prompts a clarification question before executing any tool.

### 7. Voice Input

- Microphone button in the chat input bar.
- Hold to record (push-to-talk) or tap to toggle continuous recording.
- Audio is transcribed client-side via the configured STT model.
- Transcript is injected into the chat input and processed as text.
- Visual indicator shows recording state and confidence level.

### 8. Settings

- **Active game**: switch between saved games or delete them.
- **AI models**: select STT model and LLM from a dropdown; default values are `openai/whisper-base` and `HuggingFaceTB/SmolLM3-3B`.
- **Model download status**: progress bar shown on first use; cached thereafter.
- **Chat history**: option to clear conversation log.

---

## Views / Screens

```
Home
 └─ Game list + New Game button

Game
 ├─ Scoring (default tab)
 ├─ Leaderboard
 ├─ Chart
 ├─ Table
 └─ [Chat drawer, always accessible]

Settings
```

---

## Non-Functional Requirements

- **Mobile-first**: designed for ≥ 375 px viewport; touch targets ≥ 44 × 44 px.
- **Offline-first**: no network required after model download; game data persisted in `localStorage`.
- **No backend**: zero server calls for game logic. AI inference runs entirely in-browser via WebWorkers.
- **Performance**: UI interactions must not block the main thread; model inference is always off-thread.
- **Accessibility**: sufficient color contrast; all interactive elements keyboard-accessible.
