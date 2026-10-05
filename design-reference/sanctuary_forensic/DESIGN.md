---
name: Sanctuary Forensic
colors:
  surface: '#fbf9f6'
  surface-dim: '#dbdad7'
  surface-bright: '#fbf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeeb'
  surface-container-high: '#eae8e5'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#4e444a'
  inverse-surface: '#30312f'
  inverse-on-surface: '#f2f0ed'
  outline: '#80747a'
  outline-variant: '#d1c3ca'
  surface-tint: '#78536e'
  primary: '#260921'
  on-primary: '#ffffff'
  primary-container: '#3d1e36'
  on-primary-container: '#ad83a0'
  inverse-primary: '#e7b9d8'
  secondary: '#785463'
  on-secondary: '#ffffff'
  secondary-container: '#ffd0e1'
  on-secondary-container: '#7b5665'
  tertiary: '#1e1200'
  on-tertiary: '#ffffff'
  tertiary-container: '#382600'
  on-tertiary-container: '#ab8b50'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd7f1'
  primary-fixed-dim: '#e7b9d8'
  on-primary-fixed: '#2e1128'
  on-primary-fixed-variant: '#5e3c55'
  secondary-fixed: '#ffd8e6'
  secondary-fixed-dim: '#e8bacb'
  on-secondary-fixed: '#2e131f'
  on-secondary-fixed-variant: '#5e3d4b'
  tertiary-fixed: '#ffdea6'
  tertiary-fixed-dim: '#e6c181'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5b430e'
  background: '#fbf9f6'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display-hero:
    fontFamily: Newsreader
    fontSize: 4rem
    fontWeight: '400'
    lineHeight: 4.5rem
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Newsreader
    fontSize: 2.5rem
    fontWeight: '400'
    lineHeight: 3rem
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 2.5rem
    fontWeight: '400'
    lineHeight: 3rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 1.875rem
    fontWeight: '400'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 1.75rem
    fontWeight: '500'
    lineHeight: 2.25rem
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 1.25rem
    fontWeight: '500'
    lineHeight: 1.75rem
  title-md:
    fontFamily: Manrope
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.6rem
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Manrope
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
  body-lg:
    fontFamily: Manrope
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
  body-md:
    fontFamily: Manrope
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Manrope
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.35rem
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.06em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '400'
    lineHeight: 0.875rem
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is engineered for a platform serving women creators navigating harassment, content piracy, impersonation, and deepfakes. The environment rejects standard cybersecurity clichés—there are no matrix terminals, aggressive neon shields, or clinical hospital aesthetics. Instead, it balances high-rigor legal-grade forensics with editorial empathy, calm authority, and restorative dignity.

The design movement is an intersection of **Editorial Minimalism** and **Tactile Archival Precision**:
- **Dignified & Reassuring:** Interfaces present evidence and threat levels without sensationalism or anxiety-inducing flashing warnings.
- **Forensic & Methodical:** Micro-details rely on hairline metadata dividers, precise timestamp badges, subtle coordinates, and archival index structures.
- **Human-Centered Luxury:** Soft, warm paper-toned surfaces and rich aubergine tones evoke an exclusive sanctuary or an investigative atelier rather than an algorithmic monitoring dashboard.

## Colors

The palette avoids stark sterile whites and artificial blacks in favor of an organic, warm-cast architectural palette.

- **Primary (`#3D1E36` — Deep Aubergine):** Anchors primary brand interactions, major structural containers, and dominant CTAs. It delivers the decisive gravity of black while retaining organic depth.
- **Secondary (`#B88E9E` — Muted Mauve):** Applied to secondary highlights, interactive hovers, subtle focus tags, and structural sub-borders.
- **Tertiary (`#C8A668` — Champagne Gold):** Serves as an affirmation marker denoting active protection, cryptographic verification, vaulted assets, and legal-grade seal integrity.
- **Neutral Canvas (`#FAF8F5` base, `#F5F0EB` tint):** Layered warm ivory that serves as an optical rest for high-stress sessions.
- **Semantic Restraint:**
  - *Threat / Incident (`#A83232` brick red):* Subdued, matte, and never flashing; paired with `#FDF2F2` tinted badges.
  - *Investigation / Advisory (`#B4782A` ochre amber):* Quiet awareness paired with `#FEF8EE`.
  - *Protection / Verified (`#436850` muted spruce sage or `#C8A668` champagne):* Reassuring and grounded.

## Typography

The typographic system creates an intentional tension between editorial warmth and forensic exactitude:

- **Display & Headlines (Newsreader):** Brings humanistic, literary authority. Set with generous line heights and italic flourishes where narrative emphasis is required. Never used for machine-generated data or status values.
- **Body & Structural Interface (Manrope):** A clean, modern geometric sans that delivers clarity across dense evidentiary tables, threat logs, and advisory notes without looking corporate or technical.
- **Metadata & Evidence Telemetry (JetBrains Mono):** Scaled down specifically for cryptographic hashes, timestamps, digital chain-of-custody tags, domain registrars, and status badges. Always uppercase with loose tracking (`0.06em` to `0.08em`) to mimic stamped field-dossier tags.

## Layout & Spacing

The layout model mimics an expansive editorial dossier using a responsive 12-column grid.

- **Desktop (1200px+):** 12 columns, 48px canvas margin, 24px gutters. Evidence feeds and triage views operate with asymmetric side rails (e.g., 4-column threat context rail, 8-column ledger/forensic view).
- **Tablet (768px - 1199px):** 8 columns, 32px canvas margin, 20px gutters. Dossier details transition into sliding contextual sheets.
- **Mobile (< 768px):** 4 columns, 20px canvas margin, 16px gutters. Heavy reliance on vertical stack rhythm, sticky actions, and collapsible metadata drawers.
- **Spacing Rhythm:** Built around an 8px base grid, leaning toward open internal padding (`space-xl` and `space-lg`) to prevent cognitive overload during acute incident response.

## Elevation & Depth

Visual hierarchy uses physical material cues rather than aggressive shadow lifts. Surfaces resemble archival vellum, pressed handmade paper, and structural matte planes.

- **Tonal Hierarchy:**
  - Base canvas: `#FAF8F5`
  - Layer 1 Cards & Dossiers: `#FFFFFF` with hairline `#E8E0D7` border
  - Layer 2 Nested modules & Telemetry trays: `#F5F0EB`
  - Elevated Overlays & Modals: `#FFFFFF`
- **Atmospheric Shadows:** Deeply diffused, multi-stop shadows with plum undertones (`rgba(61, 30, 54, 0.04)` to `rgba(61, 30, 54, 0.08)`) instead of gray/black.
  - *Standard Card:* `0 2px 8px -2px rgba(61, 30, 54, 0.03), 0 1px 2px rgba(61, 30, 54, 0.02)`
  - *Elevated Inspector Panel:* `0 12px 32px -8px rgba(61, 30, 54, 0.06), 0 4px 12px -2px rgba(61, 30, 54, 0.03)`
- **Boundary Precision:** Borders are strictly 1px hairlines (`#E8E0D7` on ivory, `#DFD6CB` on white) creating tactile separation without visual weight.
- **Concentric Watermark Accents:** Soft radial gradients and subtle vector contour lines (representing digital fingerprint rings) are ghosted into headers at 3–5% opacity.

## Shapes

The platform adopts a tailored, precise geometry (`roundedness: 1`). 

- **Cards, Panels, and Containers:** Fixed at `0.25rem` (4px) to `0.5rem` (8px). Corners are never overly rounded or bubble-like; they retain the crispness of fine stationery or a passport booklet.
- **Badges, Hash Indicators, and Status Pills:** Use subtle `2px` corners or full containment pills strictly when denoting immutable states (e.g., "VAULTED", "TAKEDOWN ISSUED").
- **Interactive Surfaces:** Standard input fields, actionable tiles, and segmented controls maintain a structured, razor-sharp 4px radius with hairline definition.

## Components

### Buttons & Actions
- **Primary Command:** Solid `#3D1E36` (Aubergine) fill, `#FAF8F5` text, subtle 4px border radius. Hover introduces `#4E2746` with a gentle 1px y-translation. Active state scales to `0.99`.
- **Secondary / Archival:** Transparent background, hairline border in `#DFD6CB`, `#1F1D20` text. Hover shifts background to `#F5F0EB`.
- **Protective Action (Vault / Seal):** `#FAF4E8` background with `#C8A668` border and `#745A24` text, communicating legal safety and permanence.
- **Destructive / Urgent:** `#FDF2F2` background, `#A83232` border, `#8B2525` text. No aggressive neon reds.

### Forensic Cards & Dossiers
- White surface (`#FFFFFF`) framed by a 1px border of `#E8E0D7`.
- The card header features a dedicated metadata band: JetBrains Mono tracking code on the left (e.g., `CASE-8942-B`), accompanied by a calm status chip on the right.
- Internal divider lines use `#F5F0EB` hairlines with zero shadow bleed.

### Badges & Status Chips
- Height: 22px to 26px.
- Typographic standard: `label-sm` (JetBrains Mono uppercase).
- Variants:
  - *Active Monitoring:* Soft amber-ochre tint (`bg: #FEF8EE`, `border: #F3E4CD`, `text: #94601A`).
  - *Takedown Verified:* Soft spruce (`bg: #F0F5F2`, `border: #D3E4D9`, `text: #2D523B`).
  - *High Severity:* Subdued brick (`bg: #FDF2F2`, `border: #F5D3D3`, `text: #A83232`).

### Input Fields & Search
- Background: `#FFFFFF` or `#FAF8F5` dependent on canvas level.
- Border: 1px `#DFD6CB`.
- Focus state: Border transitions to `#3D1E36` with a delicate outer ring: `box-shadow: 0 0 0 3px rgba(184, 142, 158, 0.25)` (Muted Mauve glow).
- Placeholders: Set in `body-md` Manrope with muted slate tint (`#8A8189`).

### Selection Controls (Checkbox / Radio / Switches)
- **Checkboxes:** Squared 3px radius, 1px `#6E666D` border. Checked state fills `#3D1E36` displaying an ivory check glyph.
- **Radios:** Outer ring with concentric `#3D1E36` dot; non-selected rings use `#DFD6CB`.
- **Switches:** Compact pill tracks (`#E8E0D7`), transitioning to `#3D1E36` on activation. The tactile thumb uses a clean `#FFFFFF` disc with subtle aubergine drop shadow.

### Domain-Specific Components
- **Evidence Vault Tile:** Features subtle radial fingerprint vector arcs etched into the corner, an immutable timestamp footer, and a single-click "Copy Cryptographic Hash" micro-interaction.
- **Takedown Progress Stepper:** A quiet, horizontal hairline path connecting numbered circular nodes (`#3D1E36` active, `#DFD6CB` pending) representing stages: Detection, Legal Notice, Host Response, Removal Confirmed.