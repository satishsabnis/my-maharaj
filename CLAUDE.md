# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Project

- Stack: React Native / Expo SDK 55 / TypeScript / Vercel / Supabase / claude-haiku-4-5-20251001
- Repo: github.com/satishsabnis/my-maharaj.git
- Live app: app.my-maharaj.com | Landing: www.my-maharaj.com
- Supabase project: ljgfvoyloeelnmugysrk (ap-northeast-2)

## Version convention

Format: `major.month.sequential` e.g. `Beta v3.05.91`

On every commit: bump `APP_VERSION` in `constants/version.ts`, then:

```bash
git add -A
git commit -m "fix/feat: description"
git tag vX.XX.XX
git push origin master
git push origin vX.XX.XX
```

## Working method

- One fix at a time.
- Read the file fully before making any change.
- After every change, verify the edit is actually in the file.
- Test after fixing: run `node` test or `npx tsc --noEmit`.
- After every commit, print an audit table: col 1 fix name | col 2 what was done | col 3 file and line number.
- If something cannot be done, say so immediately with the reason. Never defer.

## Absolute UI rules

- **No emojis** anywhere in the app.
- **Back button**: text "Back", outline style, border `#2E5480`. Never arrows. Always use `buttons.back` / `buttons.backText` from `constants/theme.ts`.
- **Home button**: filled `#2E5480`. Always use `buttons.home` / `buttons.homeText` from `constants/theme.ts`.
- Back + Home are always placed **below the header** in a side-by-side row. Never inside the header.
- **Background**: `assets/background.png` edge-to-edge via `ImageBackground` on every screen. No gradients, no solid colours.
- Maharaj = male, he/him pronouns only.
- No millets in any dish recommendation.
- Jain dishes never shown to non-Jain users.

## Colour system

| Token | Hex | Usage |
|-------|-----|-------|
| Primary Navy | `#2E5480` | Borders, filled buttons, headers |
| Gold | `#C9A227` | Accent, gold buttons |
| Teal | `#1A6B5C` | Secondary labels |
| Mint | `#D4EDE5` | Selected row backgrounds |
| Emerald | `#1E9E5E` | Success, selected chips |

Button fills: Gold → bg `#C9A227`, text `#1A1A1A`, `fontWeight 500`. Navy → bg `#2E5480`, text white, `fontWeight 500`. Outline → transparent bg, border 1.5px `#2E5480`, text `#2E5480`.

**Always import from `constants/theme.ts`** — never write custom button or card styles inline.

## Meal generation rules

- **RULE 1 DIETARY**: non-veg users must get at least 1 non-veg dish per day on non-veg days.
- **RULE 2 UNIQUENESS**: `weekHistory` passed to every generation call; zero repeats within a day or across the 7-day window.
- **RULE 3 CUISINE**: hard filter via RAG — only dishes matching the user's selected cuisines.
- **Veg Saturday**: always hardcoded, never overridable.
- **Dish names**: Claude never invents dish names — all dish names come from the Supabase dish pool only.
- **Jain dishes**: never shown to non-Jain users.

## Commands

```bash
npm start          # Expo dev server (scan QR for device)
npm run web        # Web browser via Expo
npm run android    # Android emulator / device
npm run ios        # iOS simulator / device
npx tsc --noEmit  # TypeScript check (no lint script exists)
```

**Deploy:** `npx expo export --platform web` → `dist/` → Vercel auto-deploys on push to master.

## Architecture

Expo Router (React Native + web) app + Vercel serverless API + Supabase.

### Directory layout

```
app/                  Expo Router screens — each file is a route
  cook/               Separate cook/helper portal (own auth flow)
api/                  Vercel serverless functions (Node.js, not TypeScript)
lib/                  Shared client-side utilities (TypeScript)
components/           Reusable UI components
constants/theme.ts    Single source of truth for all colors, buttons, cards, typography
supabase/migrations/  SQL migrations — apply manually via Supabase dashboard
```

### Routing and auth flow

`app/_layout.tsx` runs first: calls `/api/invalidate-sessions` (force-logout on version bump), checks Supabase session, redirects to `dietary-profile?firstSetup=true` if profile incomplete.

`app/index.tsx` (splash) then routes: no session → `/login`, no lang → `/language-select`, no profile row → `/onboarding`, `profile_completed === true` → `/home`.

`meal-wizard` has `gestureEnabled: false` — swipe-back is intentionally disabled to prevent accidental plan loss.

### AI calls

All Claude calls go through the Vercel proxy — never directly from client to Anthropic.

- `lib/ai.ts` → `askClaude()` tries streaming (`/api/stream`) first, falls back to `/api/claude`
- Model: **`claude-haiku-4-5-20251001`** everywhere
- Header `x-maharaj-secret` required on all API calls (matches `MAHARAJ_API_SECRET` Vercel env var)
- `api/claude.js` reads `CLAUDE_KEY` Vercel env var for the Anthropic key

### Meal plan data shape

```ts
// MealPlanDay[]
anatomy: {
  breakfast?: AnatomyComponent               // single dish
  lunch?:     { curry, veg, raita, bread, rice }   // MealAnatomy
  dinner?:    { curry, veg, raita, bread, rice }
  snack?:     AnatomyComponent
}
```

`curry` can be `AnatomyComponent | AnatomyComponent[]` (some meals have two curries).

In the plan-summary UI: curry/main dishes are tappable (open recipe modal). Veg / raita / bread / rice are plain `<Text>` — not tappable.

### Dual storage pattern

Every screen reads Supabase first, falls back to AsyncStorage. On first post-login run, `_layout.tsx` migrates AsyncStorage → Supabase (fire-and-forget). Key AsyncStorage keys:

| Key | Content |
|-----|---------|
| `confirmed_meal_plan` | Current week's `MealPlanDay[]` |
| `menu_history` | Array of past plans |
| `meal_prep_tasks` | `PrepTask[]` |
| `maharaj_day` | Day of week Maharaj is set to |
| `maharaj_lang_set` | Flag: language chosen |
| `profile_setup_complete` | Flag: dietary profile done |
| `dish_feedback` | `Record<dishName, {rating, count, isFavourite}>` |

### Supabase tables

`profiles`, `family_members`, `meal_plans`, `dish_feedback`, `dish_history`, `meal_prep_tasks`, `cuisine_preferences`, `user_dishes` (favourites), `user_banned_dishes`, `family_recipes`.

All tables have RLS. Use `getSessionUser()` from `lib/supabase.ts` — retries once with `refreshSession()`. Never call `supabase.auth.getUser()` directly.

### Sarvam API

`api/sarvam-translate.js` and `api/sarvam-tts.js` proxy to Sarvam AI for Indian language translation and TTS. Language code maps exist in both `api/generate-pdf.js` and `app/meal-wizard.tsx` — keep them in sync. `planSummaryLanguage` in user profile drives PDF language.

### Cook portal

`app/cook/` is a separate auth flow for the family's cook. Own layout, login, home. Auth via `api/cook-auth.js` — independent of Supabase user auth.

### Known broken item

`api/generate-pdf.js` line 5: `require('pdfmake')` returns a plain object, not the `PdfPrinter` constructor. Fix: change to `require('pdfmake/src/printer')`.
