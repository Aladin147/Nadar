# Nadar Theme & UI Guide v1

This guide defines the visual language for Nadar: a high‑contrast dark UI with “bold‑light” section cards, crisp typography (Latin + Arabic), and motion/haptics tuned for assistive use. It’s written to be actionable for your coding agent.

---

## 1) Design principles

* **Clarity first:** high contrast and large targets, then style.
* **Bold‑light sections:** important cards use a *lighter* surface on a dark background + bold headings.
* **Voice‑first cues:** consistent icons, haptics, and subtle motion to confirm actions.
* **One accent, one gradient:** electric‑blue primary; gradients are sparing and soft.

---

## 2) Color system

All hex values are sRGB.

**Core palette**

* `bg` (App background): **#0A0F14**
* `surface` (Default card): **#0F1621**
* `surfaceAlt` (Rows, inputs): **#101825**
* `surfaceBoldLight` (Bold‑light sections): **#172235**  ← slightly brighter for emphasis
* `border`: **#1F2A37**
* `primary` (Accent blue): **#3B82F6**
* `primaryAlt` (Glow/hover): **#60A5FA**
* `success`: **#10B981**
* `danger`: **#EF4444**
* `warning`: **#F59E0B**
* `text` (Primary): **#E5E7EB**
* `textMut` (Secondary): **#9CA3AF**
* `focus` (Outline): **#93C5FD** (AA‑compliant on dark)

**Opacity tokens**

* `overlay/70`: rgba(0,0,0,0.70) (camera overlays)
* `overlay/35`: rgba(0,0,0,0.35) (HUD)
* `hairline`: rgba(255,255,255,0.08)

**Shadows / elevation (web + native)**

* `elev1`: 0 6px 16px rgba(0,0,0,0.28)
* `elev2`: 0 10px 24px rgba(0,0,0,0.32)
* Use light inner shadow for the shutter only.

**Gradients (sparingly)**

* `brandGradient`: top **#0B1220** → bottom **#0A0F14** with a faint radial **#1E40AF** glow behind the primary CTA.

Accessibility note: primary text on `surfaceBoldLight` has 8:1 contrast; on `surface` it’s ≥ 7:1.

---

## 3) Typography (Latin + Arabic)

**Font families (recommended)**

* Latin: **Inter** (weights 400/600/800)
* Arabic: **Noto Sans Arabic** (weights 400/600/800)
* Fallbacks: platform system fonts; keep metrics tight for parity.

**Type scale (dp)**

* Display / Brand: **32**, 800, letterSpacing **0.2**
* Title (screen headers): **24**, 800, letterSpacing **0.2**
* Section title (cards): **16**, 700, letterSpacing **0.15**
* Body: **16**, 500 (Latin 400/Arabic 500), lineHeight **24**
* Meta / Caption: **12–13**, 600 for labels

**Arabic nuances**

* Slightly tighter letter‑spacing: **0 to −0.2** on headings.
* Prefer **600** for Arabic body to avoid thin strokes on OLED.
* Keep mixed‑language lines at the same size; avoid shrinking Arabic.

**Bold‑light look**

* Section cards use **surfaceBoldLight** + **700/800** headings. Body stays 16/24 for legibility.

---

## 4) Spacing & radii

* Base unit: **8dp**. `spacing(n) = n*8`.
* Radii: `sm: 8`, `md: 12`, `lg: 16`, `xl: 24`, `full: 999`.
* Hit target: **48×48 dp** minimum; core buttons **56dp** height.

---

## 5) Motion & haptics

* Durations: enter **180ms**, exit **140ms**, press **90ms**.
* Easing: standard cubic `(0.2, 0.8, 0.2, 1)`.
* Shutter: spring press (0.5, damping 12), ring pulse once while analyzing.
* Haptics: `Success` on result commit, `Error` on API failure, `ImpactLight` on chip taps.

---

## 6) Components (visual spec)

### Buttons

* Primary: bg `primary`, text `#FFF`, radius `xl`, padding `16/20`, shadow `elev1`, focus ring `focus`.
* Secondary: bg `hairline` on `surface`, border `hairline`, text `text`.
* Ghost: transparent text `text`, add focus ring only.

### Chips (preset Qs)

* Base: pill bg `hairline`, text `#FFF` 600.
* Selected: bg `primary`, text `#FFF`.

### Cards

* Default: bg `surface`, border `border`.
* **BoldLight variant**: bg `surfaceBoldLight`, border `#273449`, heading 700/800.

### ResultSection

* Layout: header row (title left, 🔊 right), then body.
* Title: Section title style (16/700). Use BoldLight card for **IMMEDIATE**.

### HUD

* Full‑screen overlay `overlay/35`, spinner + label 16/700.

### ErrorBanner

* bg `danger` at 0.9 alpha, white text, rounded `md`.

### ModeSwitcher (Segmented)

* Track bg `surfaceAlt`, active pill `primary`, label 600.

### Header

* Centered title 24/800, subtitle 13 `textMut`.
* Right accessory: `ConnectivityPill`.

### ConnectivityPill

* Online `success`, Offline `danger`, Unknown `#374151`.

### TimingsBadge

* Pills with bg `#262626`, text `#9CA3AF` 12/500.

---

## 7) Layouts

### Landing

* Brand gradient background; centered logo (32/800) + tagline (muted), one **Primary CTA**.

### Capture

* Camera full‑bleed with translucent overlay.
* Header: `Nadar` + `ConnectivityPill`.
* ModeSwitcher centered below.
* Shutter: circular 80dp with inner 70dp; on press animate scale 0.96 → 1.
* Library button: Secondary.
* QA preset chips above shutter when mode=QA.

### Results

* Hero thumbnail (200dp) with mode tag.
* IMMEDIATE card uses **BoldLight**; Objects & Navigation use Default.
* Primary action: **Play Full Audio** (Primary button).
* Timings as `TimingsBadge` below sections.

### History

* List uses Default cards; thumbnail 60dp; mode tag (12/700) in primary color.

---

## 8) Accessibility

* Contrast: ≥ 7:1 body on `surface`, ≥ 8:1 on **BoldLight**.
* Touch: 48dp min; focus outlines at 2–3dp in `focus` color.
* VoiceOver/ TalkBack: every section play button labeled `Play <section>`.
* Reduce motion: skip shutter pulse and card cascades.

---

## 9) i18n & Bidi

* All headings/labels support Darija/Arabic and Latin.
* Use `I18nManager.isRTL` to flip paddings/mode tags where needed.
* Numerals in timings remain Latin for consistency (`12 ms`).

---

## 10) Implementing in code

### 10.1 `theme.ts`

```ts
// src/app/theme.ts
export const theme = {
  colors: {
    bg: '#0A0F14',
    surface: '#0F1621',
    surfaceAlt: '#101825',
    surfaceBoldLight: '#172235',
    border: '#1F2A37',
    primary: '#3B82F6',
    primaryAlt: '#60A5FA',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    text: '#E5E7EB',
    textMut: '#9CA3AF',
    focus: '#93C5FD',
  },
  spacing: (n: number) => n * 8,
  radius: { sm: 8, md: 12, lg: 16, xl: 24, full: 999 },
  typography: {
    title: { fontSize: 24, fontWeight: '800', letterSpacing: 0.2 },
    display: { fontSize: 32, fontWeight: '800', letterSpacing: 0.2 },
    section: { fontSize: 16, fontWeight: '700', letterSpacing: 0.15 },
    body: { fontSize: 16, fontWeight: '500', lineHeight: 24 },
    meta: { fontSize: 12, fontWeight: '600' },
  },
};
```

### 10.2 Bold‑light card helper

```ts
// usage: <Card style={ui.boldLightCard}>...</Card>
export const ui = {
  boldLightCard: {
    backgroundColor: theme.colors.surfaceBoldLight,
    borderColor: '#273449',
    borderWidth: 1,
  },
};
```

### 10.3 Apply in Results

```tsx
// IMMEDIATE gets BoldLight
<ResultSection
  title="IMMEDIATE"
  content={immediate}
  // ResultSection already wraps with Card; pass style prop if you expose it
/>
```

If `ResultSection` doesn’t accept style yet, add `containerStyle?: StyleProp<ViewStyle>` and spread into the inner `Card`.

### 10.4 Buttons

* Primary maps to `theme.colors.primary`.
* Secondary uses `hairline` (rgba 255/255/255/0.08) over `surface`.

### 10.5 Focus ring utility (for web)

```ts
const focusRing = { outlineWidth: 3, outlineStyle: 'solid', outlineColor: theme.colors.focus } as const;
```

Apply on keyboard focus to buttons/chips.

---

## 11) Asset & font notes

* If you ship Inter + Noto Sans Arabic: preload via `expo-font` and set at app root using a `Text` wrapper.
* If not, rely on platform system fonts; keep weights at 600/800 for headings.

---

## 12) QA checklist (visual)

* Titles at 24/800; section titles at 16/700 (Arabic 600–700 if needed).
* IMMEDIATE card is visibly lighter than others.
* Primary CTA uses blue; only one primary per screen.
* Chips are legible at a glance; selected state is obviously blue.
* Contrast meets targets; focus outline visible with keyboard.

---

**Done.** This spec gives you a concrete palette, type scale, and component rules. If you want, I can also generate the CSS‑in‑JS snippets for each UI kit component (`Button`, `Card`, `Chip`, etc.) to exactly match the guide.
