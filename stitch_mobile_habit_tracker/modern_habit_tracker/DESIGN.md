---
name: Modern Habit Tracker
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3c4a46'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6b7a76'
  outline-variant: '#bacac5'
  surface-tint: '#006b5f'
  primary: '#006b5f'
  on-primary: '#ffffff'
  primary-container: '#2dd4bf'
  on-primary-container: '#00574d'
  inverse-primary: '#3cddc7'
  secondary: '#0060ac'
  on-secondary: '#ffffff'
  secondary-container: '#64a8fe'
  on-secondary-container: '#003c70'
  tertiary: '#a43073'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffa2ce'
  on-tertiary-container: '#8d1c60'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#62fae3'
  primary-fixed-dim: '#3cddc7'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#005047'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#ffd8e7'
  tertiary-fixed-dim: '#ffafd3'
  on-tertiary-fixed: '#3d0026'
  on-tertiary-fixed-variant: '#85145a'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

The design system is centered on the concept of **Positive Momentum**. It aims to reduce the friction of self-improvement by creating a digital environment that feels refreshing rather than demanding. The target audience includes individuals seeking to build sustainable routines without the clutter of traditional productivity tools.

The visual style is a blend of **Minimalism** and **Tactile Modernism**. It utilizes expansive white space and a soft color palette to reduce cognitive load, while employing subtle depth and rounded geometry to make the interface feel approachable and physically "clickable." The goal is to evoke a sense of calm, clarity, and quiet encouragement every time the user checks in on their progress.

## Colors

The color palette is designed to be "Fresh & Focused." 

*   **Primary (Mint Green):** Used for success states, active habit streaks, and main action buttons. It symbolizes growth and vitality.
*   **Secondary (Calm Blue):** Used for focus sessions, informational icons, and secondary navigation. It provides a stabilizing, trustworthy contrast to the mint.
*   **Tertiary (Soft Pink):** Used sparingly for "self-care" specific tasks or delightful micro-interactions (like heart animations).
*   **Neutral (Slate & Soft Gray):** A range of cool-toned grays ensures the interface remains clean. Surfaces use very light tints of blue-gray to avoid the starkness of pure black and white.

Backgrounds should primarily use a soft off-white (#F8FAFC) to allow the mint and blue accents to pop without straining the eyes.

## Typography

This design system utilizes **Plus Jakarta Sans** across all levels to maintain a friendly, contemporary, and cohesive feel. The typeface’s open apertures and soft curves provide excellent readability for a mobile-first experience.

*   **Headlines:** Use Bold and Semi-Bold weights with slight negative letter spacing to create a strong, confident visual hierarchy.
*   **Body Text:** Primarily uses the Regular weight. Line heights are generous (1.5x) to ensure the interface feels breathable.
*   **Labels:** Used for navigation and metadata, these utilize Medium or Semi-Bold weights at smaller sizes to maintain legibility and professional structure.

## Layout & Spacing

The layout follows a **Fluid Grid** philosophy optimized for mobile touchpoints. It uses a 4px baseline grid to ensure all elements are mathematically aligned and visually harmonious.

*   **Mobile (Default):** A single-column layout with 20px side margins. Elements span the full width or are grouped in card sets.
*   **Tablet/Desktop:** Content is centered within a maximum width container (max-width: 768px for focus), as habit tracking is an inherently personal, narrow-focus activity.
*   **Touch Targets:** Interactive elements (buttons, toggles) must maintain a minimum height of 48px to ensure ease of use while moving.
*   **Rhythm:** Vertical rhythm is driven by the 16px (md) and 24px (lg) units to separate distinct habit categories and daily sections.

## Elevation & Depth

This design system uses **Tonal Layers** and **Ambient Shadows** to create a sense of tactile hierarchy.

1.  **Level 0 (Background):** Solid off-white (#F8FAFC).
2.  **Level 1 (Cards/Content):** Pure white surface with a very soft, diffused shadow (0px 4px 20px rgba(0,0,0,0.04)). This makes habit cards appear to float slightly above the canvas.
3.  **Level 2 (Active/Pressed):** When a habit is "completed," the card may settle (reduced shadow) or display a subtle inner glow using the primary color.
4.  **Glassmorphism:** Bottom navigation bars and top headers use a high-density backdrop blur (20px) with a semi-transparent white fill (80% opacity) to maintain context of the content scrolling beneath them.

## Shapes

The shape language is consistently **Rounded** to reinforce the "friendly and approachable" brand narrative.

*   **Standard Elements:** Cards, input fields, and standard containers use a 16px (rounded-lg) corner radius.
*   **Interactive Elements:** Primary buttons and progress bar containers use a **Pill-shaped** (full radius) treatment to signify their interactive nature.
*   **Checkmarks/Icons:** Habit completion toggles are circular, providing a distinct geometric contrast to the rectangular habit cards.

## Components

### Buttons
Primary buttons are pill-shaped, using the Primary (Mint) color with white text. They should include a subtle 2px bottom "haptic" border that is 10% darker than the surface color to feel more tactile.

### Habit Cards
Large, rounded-lg containers. They feature a clear title (headline-md), a progress indicator, and a large circular "complete" button on the trailing edge. These cards use the Level 1 shadow for depth.

### Progress Bars
Pill-shaped tracks with a light gray background and a Primary (Mint) or Secondary (Blue) fill. The fill should have a subtle gradient (top-to-bottom) to give it a 3D "tube" feel.

### Chips/Tags
Used for habit categories (e.g., "Health," "Work"). These are small, pill-shaped elements with low-saturation background tints and high-saturation text of the same hue.

### Input Fields
Soft-gray backgrounds with no borders, using 16px corner radii. On focus, they transition to a white background with a thin Primary (Mint) stroke.

### Empty States
Utilize soft, organic illustrations and centered "body-lg" text to encourage the user to add their first habit, ensuring the screen never feels "broken" or "empty."