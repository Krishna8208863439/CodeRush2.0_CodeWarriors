---
name: Civic Horizon
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#c6c6cd'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#909097'
  outline-variant: '#45464d'
  surface-tint: '#bec6e0'
  primary: '#bec6e0'
  on-primary: '#283044'
  primary-container: '#0f172a'
  on-primary-container: '#798098'
  inverse-primary: '#565e74'
  secondary: '#c3c0ff'
  on-secondary: '#1d00a5'
  secondary-container: '#3626ce'
  on-secondary-container: '#b3b1ff'
  tertiary: '#bcc7de'
  on-tertiary: '#263143'
  tertiary-container: '#0c1829'
  on-tertiary-container: '#768197'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  tabular-nums:
    fontFamily: Inter
    fontSize: inherit
    fontWeight: inherit
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style
The design system is engineered for civic engagement, balancing institutional authority with modern digital agility. It draws from **Modern Corporate** and **Glassmorphism** styles to create a UI that feels both grounded and transparent.

The aesthetic is defined by high-contrast legibility, generous whitespace, and subtle depth layers. It aims to evoke a sense of "Efficient Governance"—where complex social planning feels navigable and responsive. The interface prioritizes clarity of information over decorative elements, using "Electric Indigo" sparingly to direct attention and "Deep Navy" to establish trust. In its dark mode configuration, the system maintains this authority while reducing eye strain for long-form data analysis and community planning.

## Colors
The palette is rooted in a high-contrast dark mode foundation to ensure accessibility and professional weight. 

- **Primary & Tertiary:** Use Deep Navy (#0F172A) and Slate Blue (#1E293B) as the primary structural colors. In dark mode, these colors form the deep base of the interface, providing a stable, institutional background.
- **Action Indigo:** Electric Indigo (#4F46E5) is reserved for primary actions, links, and focus states, providing a vibrant focal point against the dark surfaces.
- **Semantic Logic:** Status colors are chosen for WCAG-AA compliance against dark backgrounds. "Critical" and "Resolved" should never rely on hue alone; always pair with icons.
- **Glassmorphism:** Use the glass tokens for overlaying elements like navigation bars and side panels to maintain spatial awareness of the underlying content through subtle translucency.

## Typography
The system employs a dual-font strategy. **Plus Jakarta Sans** provides a modern, approachable geometric feel for headings, while **Inter** ensures maximum legibility for long-form data and body text.

- **Tabular Numbers:** Crucial for the "Community Redressal Planner." All ID numbers, timers, and data tables must use the `tabular-nums` utility to prevent "jumping" text during updates.
- **Hierarchy:** Use the `label-md` for metadata and section headers to create clear separation between content types.
- **Contrast:** Ensure all body text maintains at least a 4.5:1 contrast ratio against the dark background surfaces.

## Layout & Spacing
This design system utilizes a **12-column fluid grid** for desktop and a **single-column stack** for mobile.

- **Spacing Rhythm:** Based on a 4px baseline grid. Most components should use 8px (sm), 16px (md), or 24px (lg) increments for internal padding.
- **Desktop:** 12 columns with 24px gutters. Main content should be capped at 1280px for readability.
- **Mobile:** Use 16px side margins. Elements like cards should span the full width minus margins to maximize horizontal real estate for data.
- **Vertical Rhythm:** Use larger "stack" values between disparate sections (e.g., 48px or 64px) to emphasize the hierarchical transition.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Glassmorphism**, rather than heavy shadows, optimized for the dark color palette.

- **Level 0 (Base):** Deep Navy (#0F172A) background.
- **Level 1 (Cards):** Slate Blue (#1E293B) background with a subtle, low-opacity border to differentiate from the base.
- **Level 2 (Overlays/Glass):** Used for navigation headers and modals. Apply `backdrop-blur: 12px` with a semi-transparent dark background and a subtle inner stroke to simulate frosted glass in a dark environment.
- **Interactive States:** On hover, cards should show a subtle increase in border brightness rather than a shadow, maintaining the "Flat-Professional" aesthetic.

## Shapes
The shape language is sophisticated and "Soft-Professional."

- **Standard Radius:** 0.5rem (8px) for buttons and inputs.
- **Large Radius:** 1rem (16px) for cards, modals, and primary containers (`rounded-lg` equivalent).
- **Extra Large:** 1.5rem (24px) for featured hero sections or promotional banners.
- **Form Elements:** Checkboxes use a 4px radius, while Radio buttons remain fully circular.

## Components
Consistent styling instructions for the civic interface in dark mode:

- **Buttons:** 
  - *Primary:* Electric Indigo (#4F46E5) background, white text, 8px radius.
  - *Secondary:* White or Light Gray outline, 2px stroke.
  - *Ghost:* No background, Electric Indigo text, background appears on hover.
- **Input Fields:** 1px border (#334155), 8px radius. Focus state uses a 2px Electric Indigo ring with 2px offset.
- **Status Chips:** Small, semi-transparent backgrounds of the status color (20% opacity) with high-contrast text of the same hue. 
- **Cards:** Slate Blue or Glass background, 16px radius, 1px subtle border. Use for grouping related redressal data.
- **Data Tables:** Strict horizontal lines only. Use `tabular-nums` for all numeric cells. Header row should use a slightly lighter slate background to differentiate from the data rows.
- **Progress Indicators:** Thick 8px tracks for visual accessibility, using the "In Progress" amber or "Resolved" emerald.