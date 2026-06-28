# Bloom Boys CRM Design System Plan

## Design Goal

The CRM should feel calm, professional, operational, and quick to navigate. It should support dense research and outreach workflows without looking decorative, childish, crowded, or like a generic sales template.

## Color

Brand colors:

- Cream: `#DFD0BD`
- Forest green: `#1A4732`
- Deep green text: `#1F4630`
- White: `#FFFFFF`

Usage:

- Use forest green for primary actions, active navigation, important status accents, and focus rings.
- Use deep green for headings and high-emphasis text when contrast is strong.
- Use cream sparingly for subtle page backgrounds, selected surfaces, or brand moments.
- Use white for main table, form, card, and workspace surfaces.
- Add neutral grays for borders, muted text, dividers, and table backgrounds.
- Avoid screens dominated by cream or green.

Supporting neutrals should carry most large surfaces: near-white page backgrounds, white work areas, soft gray borders, dark neutral body text, and muted gray secondary metadata. Brand color should guide attention rather than fill the whole interface.

Neutral palette:

- Page background: `#F8F7F4`
- Surface: `#FFFFFF`
- Subtle surface: `#F3F1EC`
- Border: `#E3DED6`
- Strong border: `#CFC7BA`
- Muted text: `#6F6A61`
- Body text: `#2D2A26`
- Heading text: `#1F4630`
- Disabled surface: `#EEEAE3`
- Disabled text: `#9B948A`

Status colors:

- Stage neutral: text `#374151`, background `#F3F4F6`, border `#D1D5DB`
- Approval written/success: text `#14532D`, background `#DCFCE7`, border `#86EFAC`
- Approval verbal/in progress: text `#1E3A8A`, background `#DBEAFE`, border `#93C5FD`
- Warning/follow-up due: text `#92400E`, background `#FEF3C7`, border `#FCD34D`
- Rejection/blocked: text `#991B1B`, background `#FEE2E2`, border `#FCA5A5`
- Unknown/unverified: text `#4B5563`, background `#F3F4F6`, border `#D1D5DB`
- Conflict/review required: text `#6B21A8`, background `#F3E8FF`, border `#C084FC`

## Typography

Recommended interface font: Inter.

Use Inter for navigation, tables, forms, filters, dense metadata, badges, and body text.

Playfair Display may be used sparingly for the Bloom Boys logo, sign-in title, or another rare brand moment. Do not use it inside dense tables, controls, dashboards, or operational forms.

Typography scale:

- Display: 40px font, 48px line height, 600 weight, Playfair only for rare brand moments.
- Page title: 28px font, 36px line height, 650 weight, Inter.
- Section title: 20px font, 28px line height, 650 weight.
- Card/title row: 16px font, 24px line height, 600 weight.
- Body: 14px font, 22px line height, 400 weight.
- Table body: 13px font, 20px line height, 400 weight.
- Metadata: 12px font, 16px line height, 500 weight.
- Badge: 11px font, 14px line height, 600 weight.

## Layout Density

- Default to compact but readable spacing.
- Tables should support scanning, sorting, filtering, sticky headers, and visible status badges.
- Detail pages should use clear sections and tabs instead of long undifferentiated pages.
- Avoid nested card stacks. Use cards for repeated items, modals, and framed tools only.
- Desktop pages should keep primary actions visible without oversized hero sections.
- Keep page sections unframed where possible; use cards only when they represent repeated records, modal content, or a genuinely framed tool.

Spacing scale:

- `2px`, `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`
- Default page gutter: `24px` desktop, `16px` tablet, `12px` mobile.
- Default section gap: `24px` desktop, `16px` narrow screens.

Border-radius scale:

- `2px` tiny controls and table badges.
- `4px` inputs, chips, compact buttons.
- `6px` standard buttons, rows, menus.
- `8px` cards, drawers, modals.
- Avoid radii above `8px` unless a future brand component explicitly needs it.

Control heights:

- Compact button/input: `32px`
- Standard button/input/select: `40px`
- Large command/search input: `48px`
- Icon button: `32px` compact, `40px` standard
- Filter chip: `28px`

Table row heights:

- Compact mode: `36px` rows, `40px` header.
- Comfortable mode: `48px` rows, `44px` header.
- Detail-heavy table rows may expand only when content wraps intentionally.

Breakpoints:

- Mobile: `<640px`
- Tablet: `640px` to `1023px`
- Desktop: `1024px` to `1439px`
- Wide desktop: `1440px+`

Borders and shadows:

- Hairline border: `1px solid #E3DED6`
- Strong border: `1px solid #CFC7BA`
- Focus border: `1px solid #1A4732`
- Subtle shadow: `0 1px 2px rgba(45, 42, 38, 0.08)`
- Raised overlay shadow: `0 12px 28px rgba(45, 42, 38, 0.16)`
- Avoid heavy decorative shadows on tables and page sections.

## Navigation

- Desktop: left sidebar with icons and labels, top search bar, quick actions, logged-in identity.
- Desktop sidebar groups: Work, then Tools and administration.
- Mobile: bottom nav for high-frequency areas and a More menu for administrative pages.
- Breadcrumbs appear on all detail pages.
- Active nav uses restrained forest-green accent, not full green blocks.
- Show logged-in identity only. Do not provide profile switching.

## Buttons and Controls

- Primary button: forest green background with white text.
- Secondary button: white background, subtle border, deep green or neutral text.
- Destructive action: muted red accent, confirmation required.
- Use icon buttons for common actions where icons are familiar; always provide accessible label/tooltips.
- Use segmented controls for view toggles such as Kanban/Table and Calendar/Table.
- Use filters as compact chips and popovers.

## Status and Badges

Badges should be small, high-contrast, and consistent.

Recommended badge categories:

- Stage
- Owner
- Tier
- Score confidence
- Approval status
- Source confidence
- Event date status
- Contact kind
- Product fit
- Review severity

Approval colors should distinguish unknown, in progress, verbal approval, written approval, rejected, expired, and not required. Do not use approval colors to imply confirmation where only interest exists.

## Tables

Tables are core CRM surfaces.

Requirements:

- Sticky header
- Sortable columns
- Column visibility presets
- Saved filters
- Row density control
- Inline badges
- Side preview drawer
- Empty, loading, and error states
- Keyboard-friendly row navigation

Avoid tiny text, low contrast, or excessive columns on mobile. Use cards or column groups on narrow screens.

## Forms

Forms should be grouped by intent:

- Identity and ownership
- Stage and next action
- Approval status
- Event and venue
- Contacts
- Products
- Source evidence

Required fields should be clear. Source-backed read-only fields should be visibly different from editable CRM fields. Manual edits to import-managed fields should show source/conflict status.

## Accessibility

- Meet WCAG AA contrast for text and controls.
- Never rely on color alone for approval or priority.
- All icon buttons require accessible labels.
- Focus states should be visible.
- Tables and modals must support keyboard navigation.
- Error messages should explain what happened and how to recover.
- Default focus ring: `2px` outline in `#1A4732` with `2px` offset.
- Destructive actions require explicit confirmation and cannot rely only on red color.
- Status badges must include text labels, not color-only dots.

## Mobile Behavior

Mobile is for quick operational work:

- View opportunity and contact details
- Tap to call or email through device tools
- Log activity
- Complete tasks
- Change stage manually
- Update approval status
- Set follow-up

Large data review and advanced research can be desktop-optimized but must remain readable on narrow screens.

## What to Avoid

- Expected revenue widgets in version one
- Generic sales pipeline graphics that ignore approval complexity
- Heavy cream backgrounds on every screen
- Oversized decorative hero sections
- Cartoonish or childish visuals
- Automatically generated outreach or stage language
- Dense ungrouped forms with no hierarchy
- One-note green, cream, or decorative palettes that make dense CRM work feel branded at the expense of readability
