# 🃏 Lunch Break Poker

A Texas Hold'em chip tracker built for quick lunch break games — no physical chips needed. Designed for iPhone 11 in portrait mode, runs entirely in the browser with no installs or accounts.

## Features

- **Session setup** — set player names, starting stacks, and blinds
- **Full Texas Hold'em flow** — Pre-Flop → Flop → Turn → River → Showdown
- **Per-player actions** — Bet/Raise, Match, Check, All-In, Fold
- **Quick bet buttons** — +50 / +100 / −50 / −100 adjustments
- **Pot tracking** — live running total across all betting rounds
- **Stacks persist** across hands for the whole session
- **Winner award** — tap to select the winner and transfer the pot

## How to Play

1. Enter player names, starting stack, and blinds then tap **Deal Me In**
2. The first two players automatically post Small Blind and Big Blind
3. Work through each player's action using the buttons on their card
4. Tap **Next Stage →** to advance through Flop, Turn, River
5. At Showdown, tap **🏆 Award Pot**, pick the winner, done
6. **Next Hand** resets the round — stacks carry over
7. **End Session** wipes everything and returns to setup

## Hosting on GitHub Pages

1. Fork or upload this repo to your GitHub account
2. Go to **Settings → Pages**
3. Under *Source*, select **Deploy from a branch**
4. Choose `main` branch and `/ (root)` folder
5. Hit **Save** — your site will be live at `https://yourusername.github.io/lunch-break-poker`

## Local Use

Just open `index.html` in any browser — no build steps, no dependencies (fonts load from Google Fonts, everything else is vanilla JS/CSS).

## Tech

- Plain HTML, CSS, JavaScript — zero frameworks
- Google Fonts (Playfair Display, DM Mono, Crimson Pro)
- Optimised for iPhone 11 portrait (390×844) with `safe-area-inset` support
