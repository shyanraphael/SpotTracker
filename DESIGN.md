---
name: Spotify Tracker
description: A festival lineup bill for your own Spotify library, in near-black green with a Spotify-green action, in dark and light themes.
colors:
  ink: "#0a0d0b"
  ink-raised: "#121813"
  ink-lifted: "#1b231d"
  text: "#f1f7f2"
  body-soft: "#cfe0d3"
  muted: "#9db0a2"
  accent: "#1ed760"
  accent-ink: "#04140a"
  electric-violet: "#8b6bff"
  lime: "#d6ff5a"
  hot-pink: "#ff4d8d"
  rule: "rgba(241,247,242,.12)"
  rule-strong: "rgba(241,247,242,.26)"
  paper: "#f2f6f2"
  paper-raised: "#ffffff"
  paper-lifted: "#e3eae4"
  paper-text: "#0d150f"
  paper-body-soft: "#2c3b31"
  paper-muted: "#526257"
  accent-text-light: "#087a34"
  violet-light: "#6b4af0"
  lime-light: "#c4f03a"
  pink-light: "#e5266f"
  warn-text-light: "#6b4700"
  err-text-light: "#8a1240"
typography:
  display:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "clamp(54px, 9vw, 96px)"
    fontWeight: 900
    lineHeight: 0.84
    letterSpacing: "0.005em"
  headline:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "clamp(26px, 3.4vw, 38px)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "0.005em"
  title:
    fontFamily: "'Big Shoulders Display', 'Arial Narrow', sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "0.01em"
  body:
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Hanken Grotesk', system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 600
    lineHeight: 1.45
rounded:
  none: "0"
  round: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "22px"
  xl: "38px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.none}"
    padding: "14px 24px"
  button-primary-hover:
    backgroundColor: "{colors.lime}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "13px 22px"
  button-ghost-hover:
    backgroundColor: "{colors.ink-lifted}"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.none}"
    padding: "9px 16px"
  chip-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
  card-playlist:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "12px"
  card-playlist-hover:
    backgroundColor: "{colors.ink-lifted}"
  rank-chip:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.none}"
    padding: "6px 10px 4px"
  search-field:
    backgroundColor: "{colors.ink-raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.none}"
    height: "52px"
  tag:
    backgroundColor: "{colors.ink-lifted}"
    textColor: "{colors.body-soft}"
    rounded: "{rounded.none}"
    padding: "3px 9px"
---

# Design System: Spotify Tracker

## Overview

**Creative North Star: "The Festival Bill"**

The library is a lineup poster. Playlists are billed by size: Headliners lead at poster scale, Main stage follows, Support runs in tight rows, and every big card carries a rank. The ground is near-black with a green cast (or, in the light theme, a pale green-white paper), set with flat colour fields, hairline rules, a faint grain, a drifting dot field and slowly rotating rings. It is a night-time, headphones-on tool, dense where working (track rows) and loud where billing (titles, headliners).

Colour has jobs. Spotify green is the action and selection colour, violet marks fields, spines and secondary selection, lime means added or hot, pink means removed. Heads are a condensed poster grotesk in capitals; working text is a small humanist grotesk. Every corner is square; circles appear only as record, ring and avatar geometry. The same system ships in two themes: dark is the default night mode, light is a daylight variant with identical roles and layout.

Motion orients: letters rise out of masks, indicators slide between chips and nav items, cards lean toward the pointer, equaliser bars animate on hover only, counts tick up, and the theme switch reveals the new theme as a circular view transition. All of it stops or settles under reduced motion.

**Key Characteristics:**
- Flat colour fields and hairlines, no glow halos, no gradient text, no glass.
- Square corners everywhere; diamonds and circles as the only accent shapes.
- Poster-scale caps heads against 13-15px working text.
- Colour carries meaning (action, selection, added, removed), never decoration alone.
- Missing artwork prints a flat swatch tile with the initial, so empty states still look billed.
- Two themes from one token set, switched by `data-theme` on the root.

## Colors

A near-black green ground (dark) or pale green paper (light) with one action green and three signal colours, each tied to one meaning. The values in the frontmatter are the dark theme unless named `paper-*` or `*-light`.

### Primary
- **Spotify Green** (`{colors.accent}`, same in both themes): the action colour. Primary buttons, active nav and chip indicators (a filled block), focus outline, caret, text selection, ticker band, card hover border default, sync progress, equaliser first bar, tag "orange" variant (misnamed, see drift), disc label. Text on it is **Accent Ink** (`{colors.accent-ink}`), in both themes.
- **Green as text** (`--accent-text`): where green sits on the page ground as type or a hairline (links, tier counts, import chip, sync icon). Dark uses `{colors.accent}`; light uses a darker **Forest** (`{colors.accent-text-light}`) so it holds contrast on paper.

### Secondary
- **Electric Violet** (`{colors.electric-violet}` dark, `{colors.violet-light}` light): fields and selection beyond action. Scrollbar thumbs, view-change line, activity spine, active toggle, "more" chips, violet tags, backdrop ring, equaliser second bar. Text on it is `--on-violet`: Ink in dark, white in light.

### Tertiary
- **Lime** (`{colors.lime}` dark, `{colors.lime-light}` light): added and hot. Rank chips, nav badge, button hover wipe, added-event pin, success tick, selected-row marks, import chip hover.
- **Hot Pink** (`{colors.hot-pink}` dark, `{colors.pink-light}` light): removed. Removed-event pins, pink tags, error banner border.

### Neutral
- **Ink / Paper** (`{colors.ink}` / `{colors.paper}`): page ground, nav, panel, and the surface behind everything.
- **Ink Raised / Paper Raised** (`{colors.ink-raised}` / `{colors.paper-raised}`): cards, search, sync, modal, event rows.
- **Ink Lifted / Paper Lifted** (`{colors.ink-lifted}` / `{colors.paper-lifted}`): hover and input fills, tags, toggles.
- **Bill White / Bill Black** (`{colors.text}` / `{colors.paper-text}`): primary text. **Back-Row Sage** (`{colors.muted}` / `{colors.paper-muted}`): secondary text, metadata, icons at rest. **Soft Body** (`{colors.body-soft}` / `{colors.paper-body-soft}`): descriptions and tag text.
- **Hairline** (`{colors.rule}`) and **Strong Hairline** (`{colors.rule-strong}`): every border and divider; light inverts to ink-tinted alphas (.13 and .32).
- **Warn text and error text** (`--warn-text`, `--err-text`): banner copy. Only the light theme defines them (`{colors.warn-text-light}`, `{colors.err-text-light}`); see drift.

### Named Rules
**The Signal Rule.** Green acts, violet selects, lime adds, pink removes. A bright fill carries the dark Accent Ink (green, lime, pink fills) or `--on-violet` (violet fills), never an unrelated white or black.
**The Two Greens Rule.** Green as a fill is always `{colors.accent}`; green as type or hairline on the page ground is `--accent-text`, which darkens in the light theme. Never set small green text on paper with the fill green.
**The Flat Field Rule.** Colour arrives as solid fields. Gradients exist only as the sticky top scrim, the mask that fades the playlist art field out toward the list, and the tinted wash behind the song sheet; never on text, cards or buttons.
**The Paired Theme Rule.** Every colour is a role token defined in both themes. Components reference tokens, never theme-specific literals, so a surface works in dark and light unchanged.

## Typography

**Display Font:** Big Shoulders Display (with Arial Narrow, sans-serif), weights 700, 800, 900, self-hosted via @fontsource
**Body Font:** Hanken Grotesk (with system-ui, sans-serif), weights 400 to 700, self-hosted via @fontsource

**Character:** A condensed poster grotesk in capitals shouts the bill; a quiet humanist grotesk does the reading. The contrast in size, not in colour, builds hierarchy.

### Hierarchy
- **Display** (900, clamp 54px to 96px, 0.84): view titles and welcome headline. Hard cap 96px.
- **Headliner** (900, clamp 40px to 76px for the lead card, 34px to 58px for the other two, 0.9): headliner playlist names; on narrow widths clamp(38px, 10vw, 56px).
- **Headline** (900, clamp 26px to 38px, 0.95): tier titles (Headliners, Main stage, Support).
- **Title** (800, 20 to 24px, 0.95): playlist card names, panel sections, modal titles (34px).
- **Body** (400 to 500, 15px, 1.45): working text; descriptions stay near 54ch.
- **Label** (600 to 700, 11.5 to 13.5px): chips, tags, metadata, sync text. Tabular numerals on counts and durations.

### Named Rules
**The Caps Bill Rule.** Every h1 to h4 is uppercase display type. Body and controls are never uppercase.

## Layout

A fixed 224px left rail (Library, Songs, Activity, account with theme switch) with a main column that has fluid side padding clamp(16px, 3vw, 44px). The top row holds a 52px search, sync and a 52px square theme button; below it a full-bleed green ticker band of totals and latest changes. Library bills in tiers: Headliners on a 1.5fr/1fr/1fr grid (two columns at 1100px, one at 860px), Main stage in auto-fill minmax(200px, 1fr), Support in tight minmax(260px, 1fr) rows with 10px gaps. Track lists are six-column rows (art, title, album, playlists, duration, open) that drop to four on phones. The welcome screen floats the theme button top-right.

Spacing rhythm is loose-to-tight by tier: 6, 10, 16, 22, 38px. Below 860px the rail becomes a 64px bottom bar, the sync button collapses to an icon, stage grids go two-up, the playlist panel goes full width and the song sheet becomes a bottom sheet. Breakpoints: 1100, 860, 340px.

## Elevation & Depth

Flat by default. Depth is tonal (Ink, Ink Raised, Ink Lifted; Paper equivalents in light) plus hairlines. Shadows are soft and used only where something lifts off the page.

### Shadow Vocabulary
- **Focus lift** (`box-shadow: 0 10px 26px -12px rgba(var(--accent-rgb), .55)`): search field when focused.
- **Artwork lift** (`box-shadow: 0 18px 36px -12px rgba(0,0,0,.6)`): hero and sleeve artwork in panels and sheets.
- **Overlay** (`box-shadow: 0 28px 60px rgba(0,0,0,.55)`): sheet and modal.
- **Hover ring** (`box-shadow: 0 0 0 1px var(--tint)`): card hover doubles the border in the card tint; not a shadow in character.

### Named Rules
**The Soft Lift Rule.** Shadows are blurred and offset-down only; no hard offset shadows.

## Shapes

Square, always (0 radius) on cards, buttons, chips, inputs, tags, art tiles, rows and the theme button. Circles are reserved for record geometry (the spinning disc, the rotating ring backdrop). The recurring accent shape is the diamond: 8 to 12px rotated squares as ticker separators, collection dots, row markers and timeline pins. Icons are 24-grid inline SVG line icons. Borders are 1px hairlines; the one 2px rule is the tier header line.

## Components

### Buttons
- **Shape:** square (0), 14px 24px padding.
- **Primary (CTA):** green fill, Accent Ink text, bold. Hover wipes a Lime fill in from the left and nudges the arrow 4px; press scales to .97; disabled drops to .4 opacity. A magnetic wrapper leans it toward a mouse pointer.
- **Ghost:** 1px strong hairline, transparent; hover fills Ink Lifted and brightens the border to full text colour.
- **Icon ghost:** 38px square, muted; hover Ink Lifted.
- **Theme button:** 52px square, Ink Raised with hairline, same as sync; toggles with a circular view-transition reveal.

### Chips and segmented controls
- **Style:** 1px hairline, muted 13.5px text, 9px 16px padding; dashed border for the add chip.
- **State:** the selected state is a green indicator that slides between options, with Accent Ink text; a diamond dot marks collections.

### Playlist cards (the billing unit)
- **Corner Style:** square. **Background:** Ink Raised, Ink Lifted on hover. **Border:** hairline, switching to the card tint (default green) on hover. **Padding:** 12px (8px on phones).
- A solid Lime **rank chip** (display 30px, Accent Ink text) sits top-left of billed cards. On hover the art scales 1.03 and tilts, a small equaliser appears bottom-right and animates only while hovered, and an open fold button appears top-right (always visible on touch).
- Support cards are horizontal rows with a 54px art tile and no tags.
- Missing art is a flat swatch tile (green, violet, lime, pink, cyan, amber) with the initial in Ink.

### Inputs / Fields
- **Style:** 52px bar, Ink Raised fill, hairline border, muted icon; modal inputs are Ink Lifted.
- **Focus:** border turns green, fill lifts, the soft focus lift shadow appears. Global focus-visible is a 2px green outline with 2px offset.

### Navigation
- Rail items: 12px 14px, muted 600 text, with a filled green block that slides to the active item and turns its text Accent Ink. A Lime count badge pulses. On phones the items stack icon over an 11.5px label in a bottom bar, and the badge sits above and to the right of the icon.

### Track row
- Six-column grid with a hairline bottom border. A leading green diamond appears on hover or focus, the title shifts 4px, the art scales and tilts and shows an equaliser veil that animates on hover only, and an open button slides in.

### Ticker
- Full-bleed green band, display 17px caps, Ink diamonds between items, pauses on hover, and sits static with duplicates hidden under reduced motion.

### Tags
- Square, 11.5px bold, Ink Lifted by default; tone variants lime, violet (`--on-violet` text), pink, and a green one.

### Playlist art field
- Behind an open playlist panel: three tilted (-7deg) rows of that playlist's album covers (136px tiles, 108px on phones) slide in alternating directions at 70, 85 and 100 seconds, under a tint overlay (card tint at 26% over Ink at 55%), masked to fade out toward the list. Static under reduced motion.

### Count-up
- Library, Songs and panel counts tick up as state-driven numbers and settle instantly under reduced motion.

### Theme switch
- Dark and light share one token set on the root `data-theme`. The choice persists in localStorage (`st.theme`), defaults to the OS colour scheme, and is applied by an inline script in index.html before first paint. The change reveals as a circular view transition and applies instantly under reduced motion or without view-transition support.

### Activity timeline
- A 2px violet spine with diamond pins (lime added, pink removed, green new playlist) beside Ink Raised event rows that nudge 4px on hover.

## Do's and Don'ts

### Do:
- **Do** keep every corner square and use diamonds and circles only as accent geometry.
- **Do** set text on bright fills in Accent Ink (`{colors.accent-ink}`), or `--on-violet` on violet.
- **Do** use `--accent-text` for green type on the page ground so it passes contrast in light.
- **Do** define any new colour as a role token in both themes.
- **Do** let size bill the content: biggest playlists get poster-scale display type and a rank chip.
- **Do** give every animation a reduced-motion path; ticker, rings, equaliser, disc, art field and count-up all stop or settle.
- **Do** fall back to a flat swatch tile with an initial when art is missing.

### Don't:
- **Don't** use glow halos, gradient text, glass or backdrop blur.
- **Don't** use hard offset shadows; shadows are soft and downward.
- **Don't** use green fill for anything but action and selection, or lime and pink for anything but added and removed (lime also marks rank).
- **Don't** set body or control text in the display face, or head text in lowercase.
- **Don't** cap display type above 96px or let headliners overflow narrow widths.
- **Don't** hard-code theme-specific hex in components; the disc and banner tints are known exceptions, not precedent.
