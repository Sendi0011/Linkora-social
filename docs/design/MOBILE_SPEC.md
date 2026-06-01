# Linkora Mobile UI Design Specification

> Design tokens reference: [`docs/design/tokens.json`](./tokens.json)
> Accessibility baseline: [`docs/design/accessibility.md`](./accessibility.md)

---

## 1. Screen Inventory

### 1.1 Connect (`/connect`)

**Purpose:** Wallet connection entry point.

```
┌─────────────────────────────┐
│  LINKORA WALLET             │
│                             │
│  Connect your               │
│  Stellar wallet             │
│                             │
│  ┌─────────────────────┐   │
│  │  Connect Freighter  │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │  WalletConnect      │   │
│  └─────────────────────┘   │
│                             │
│  [error box if any]         │
└─────────────────────────────┘
```

**States:** disconnected → connecting (spinner in button) → connected (address panel + Continue / Disconnect).

---

### 1.2 Feed (`/(tabs)/feed`)

**Purpose:** Chronological post feed with infinite scroll.

```
┌─────────────────────────────┐
│ Feed              G…K2  ▾  │  ← header
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ PostCard                │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ PostCard                │ │
│ └─────────────────────────┘ │
│          ···                │
│  [spinner on load-more]     │
├─────────────────────────────┤
│ Feed │ Explore │ Pools │ ··· │  ← tab bar
└─────────────────────────────┘
```

**States:** initial load (4× PostCardSkeleton), populated list, empty state (📭), error state (red message), pull-to-refresh.

---

### 1.3 Explore (`/(tabs)/explore`)

**Purpose:** Search profiles and community pools.

```
┌─────────────────────────────┐
│ Explore           G…K2  ▾  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 🔍 Search profiles…    │ │  ← SearchBar
│ └─────────────────────────┘ │
│                             │
│  [idle]  Search Linkora     │
│          Find creators…     │
│                             │
│  [results]                  │
│  PROFILES                   │
│  ┌─────────────────────┐   │
│  │ ProfileRow          │   │
│  └─────────────────────┘   │
│  POOLS                      │
│  ┌─────────────────────┐   │
│  │ PoolRow             │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**States:** idle (prompt), loading (spinner), results (ProfileRow + PoolRow sections), no-match, error. Debounce: 300 ms.

---

### 1.4 Pools (`/(tabs)/pools`)

**Purpose:** Browse and interact with community funding pools.

```
┌─────────────────────────────┐
│ Pools             G…K2  ▾  │
├─────────────────────────────┤
│                             │
│        Pools                │
│  Community funding pools    │
│                             │
│  [PoolCard list — planned]  │
└─────────────────────────────┘
```

**States:** placeholder (current), populated list of PoolCards (planned).

---

### 1.5 Mini Apps (`/(tabs)/mini-apps`)

**Purpose:** Browse and launch third-party mini apps embedded via the bridge.

```
┌─────────────────────────────┐
│ Mini Apps         G…K2  ▾  │
├─────────────────────────────┤
│                             │
│       Mini Apps             │
│  Browse and launch…         │
│                             │
│  [app grid — planned]       │
└─────────────────────────────┘
```

**States:** placeholder (current), app grid (planned).

---

### 1.6 Profile (`/(tabs)/profile`)

**Purpose:** Own wallet profile — connect/disconnect shortcut.

```
┌─────────────────────────────┐
│ Profile           G…K2  ▾  │
├─────────────────────────────┤
│                             │
│         Profile             │
│   GABC…K2  (mono)           │
│                             │
│  ┌─────────────────────┐   │
│  │    Disconnect       │   │
│  └─────────────────────┘   │
└─────────────────────────────┘
```

**States:** connected (address + Disconnect), disconnected (Connect Wallet button).

---

### 1.7 Post Detail (`/post/[id]`)

**Purpose:** Full post view with tip action (detail screen, not in tab bar).

```
┌─────────────────────────────┐
│ ← Post            G…K2  ▾  │
├─────────────────────────────┤
│  POST                       │
│  #42  (mono)                │
│                             │
│  [full post content]        │
│  [tip form — planned]       │
└─────────────────────────────┘
```

---

### 1.8 Pool Detail (`/pool/[id]`)

**Purpose:** Pool stats, deposit and withdraw actions.

```
┌─────────────────────────────┐
│ ← Pool            G…K2  ▾  │
├─────────────────────────────┤
│  POOL                       │
│  creator-fund               │
│                             │
│  [balance, members]         │
│  [deposit / withdraw — planned] │
└─────────────────────────────┘
```

---

### 1.9 Profile Detail (`/profile/[address]`)

**Purpose:** Public profile view for any Stellar address.

```
┌─────────────────────────────┐
│ ← Profile         G…K2  ▾  │
├─────────────────────────────┤
│  PROFILE                    │
│  GABC…XYZ  (mono)           │
│                             │
│  [username, bio, posts]     │
│  [follow button — planned]  │
└─────────────────────────────┘
```

---

## 2. Navigation Structure

```
RootLayout (WalletProvider)
└── Tabs (bottom tab bar)
    ├── (tabs)/feed          — Feed
    ├── (tabs)/explore       — Explore
    ├── (tabs)/pools         — Pools
    ├── (tabs)/mini-apps     — Mini Apps
    ├── (tabs)/profile       — Profile
    └── [stack screens — href: null, hidden from tab bar]
        ├── connect
        ├── post/[id]
        ├── pool/[id]
        └── profile/[address]
```

**Deep links** are handled in `_layout.tsx` via `Linking` + `parseDeepLink`. Supported schemes: `linkora://post/:id`, `linkora://pool/:id`, `linkora://profile/:address`.

**Header:** Every screen shows the shared header with the wallet address pill (right slot). Tapping it navigates to `/connect`.

---

## 3. Component Library

### 3.1 PostCard

**File:** `apps/mobile/components/PostCard.tsx`

| Prop | Type | Description |
|---|---|---|
| `post` | `Post` | Post data object |

**Post shape:** `{ id, author, content, tip_total, timestamp }`

**Anatomy:**
1. Author row — truncated address (mono, `text.dark.secondary`), timestamp (`text-xs`)
2. Content — body text (`text-sm`, `lineHeight: 20`, `text.dark.primary`)
3. Footer row — tip total stat (`text-xs`, `text.dark.secondary`)

**Skeleton (`PostCardSkeleton`):** Three shimmer blocks replacing author row, content lines, and footer. Background `surface.dark.surface-2` (`#334155`).

**Dimensions:** horizontal padding 16, vertical padding 12, border-bottom `surface.dark.border`.

---

### 3.2 PoolCard

**File:** `apps/mobile/components/PoolCard.tsx`

| Prop | Type | Description |
|---|---|---|
| `id` | `string` | Pool identifier |
| `name` | `string` | Display name |
| `description` | `string` | Short description |
| `totalValue` | `string` | Formatted balance string |
| `participants` | `number` | Member count |
| `apy` | `string?` | Optional APY label |
| `isLoading` | `boolean` | Skeleton mode |
| `onPress` | `() => void` | Tap handler |

**Anatomy:**
1. Header row — name (bold, 18 px) + optional APY badge (green pill)
2. Description (14 px, `#666`)
3. Stats row — Total Value + Participants side by side

**Note:** PoolCard uses light-mode colours (`#ffffff` background). Align to dark tokens in the next design pass (see §6).

---

### 3.3 PoolRow

**File:** `apps/mobile/components/PoolRow.tsx`

Compact list row used in Explore results.

**Anatomy:**
1. Icon tile (44×44, teal `#0f766e`, `#` glyph)
2. Content column — name + balance (right-aligned), description, member/token meta
3. `minHeight: 84`, border-bottom `surface.dark.border`

---

### 3.4 ProfileRow

**File:** `apps/mobile/components/ProfileRow.tsx`

Compact list row used in Explore results.

**Anatomy:**
1. Avatar circle (44×44, `brand.primary` `#6366f1`, initial letter)
2. Content column — username (bold), bio, truncated address (mono, `text-xs`)
3. `minHeight: 76`, border-bottom `surface.dark.border`

---

### 3.5 ProfileHeader *(planned)*

Full-width header for the Profile Detail screen.

**Anatomy:**
1. Avatar (72×72, `border-radius: full`)
2. Username (bold, `text-xl`)
3. Truncated address with copy button (mono)
4. Bio (secondary text)
5. Follower / Following counts
6. Follow / Unfollow button (primary / secondary variant)

---

### 3.6 SearchBar

**File:** `apps/mobile/components/SearchBar.tsx`

| Prop | Type | Description |
|---|---|---|
| `value` | `string` | Controlled value |
| `onChangeText` | `(v: string) => void` | Change handler |
| `placeholder` | `string?` | Placeholder text |

**Dimensions:** `minHeight: 48`, `borderRadius: 10`, horizontal margin 16, `backgroundColor: surface.dark.surface-1`.

**Accessibility:** `accessibilityLabel="Search profiles and pools"`, `autoCapitalize="none"`, `returnKeyType="search"`.

---

### 3.7 WalletButton

**File:** `apps/mobile/components/WalletButton.tsx`

| Variant | Background | Usage |
|---|---|---|
| `primary` | `brand.primary` `#6366f1` | Main CTA |
| `secondary` | `surface.dark.surface-1` + border | Secondary action |
| `danger` | `semantic.error` `#dc2626` | Destructive |

**States:** `connecting` → spinner replaces label, button disabled. `disabled` → 60% opacity.

**Dimensions:** `minHeight: 48`, `borderRadius: 10`.

---

### 3.8 EmptyState

**File:** `apps/mobile/components/EmptyState.tsx`

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | Heading |
| `description` | `string` | Body copy |
| `actionText` | `string?` | Optional CTA label |
| `onActionPress` | `() => void?` | CTA handler |
| `isLoading` | `boolean` | Skeleton mode |

**Anatomy:** centred icon (64 px emoji), title (24 px bold), description (16 px), optional action button.

---

## 4. Design Token Usage on Mobile

All colour, spacing, and typography values map directly to `docs/design/tokens.json`. React Native `StyleSheet` values below use the resolved hex/number equivalents.

### Colour mapping

| Token path | Resolved value | RN usage |
|---|---|---|
| `color.surface.dark.background` | `#0F172A` | Screen `backgroundColor` |
| `color.surface.dark.surface-1` | `#1E293B` | Card, input backgrounds |
| `color.surface.dark.surface-2` | `#334155` | Skeleton shimmer, dividers |
| `color.surface.dark.border` | `#334155` | `borderBottomColor` on rows |
| `color.brand.primary` | `#7C3AED` | Primary buttons, active tab icon |
| `color.text.dark.primary` | `#F9FAFB` | Body text, headings |
| `color.text.dark.secondary` | `#9CA3AF` | Timestamps, meta, subtitles |
| `color.text.dark.disabled` | `#4B5563` | Disabled labels |
| `color.semantic.error` | `#EF4444` | Error text, danger button |
| `color.semantic.success` | `#10B981` | APY badge, confirmed state |

### Typography mapping

| Token | Resolved | RN `fontSize` |
|---|---|---|
| `typography.fontSize.xs` | 0.75 rem | 12 |
| `typography.fontSize.sm` | 0.875 rem | 14 |
| `typography.fontSize.base` | 1 rem | 16 |
| `typography.fontSize.lg` | 1.125 rem | 18 |
| `typography.fontSize.xl` | 1.25 rem | 20 |
| `typography.fontFamily.mono` | JetBrains Mono | `fontFamily: "monospace"` |

### Spacing mapping

| Token | Resolved | RN value |
|---|---|---|
| `spacing.3` | 0.75 rem | 12 |
| `spacing.4` | 1 rem | 16 |
| `spacing.6` | 1.5 rem | 24 |
| `spacing.8` | 2 rem | 32 |

---

## 5. Accessibility Requirements

### Touch targets

All interactive elements must meet the **minimum 44×44 pt** touch target (Apple HIG / WCAG 2.5.5).

| Component | Enforced via |
|---|---|
| WalletButton | `minHeight: 48` |
| SearchBar input | `minHeight: 48` |
| PoolRow | `minHeight: 84` |
| ProfileRow | `minHeight: 76` |
| Header wallet pill | `minHeight: 32, minWidth: 82` — increase to 44 in next pass |

### Contrast ratios (WCAG AA)

| Foreground | Background | Ratio | Passes |
|---|---|---|---|
| `#F9FAFB` text on `#0F172A` bg | — | 19.6:1 | ✅ AAA |
| `#9CA3AF` secondary on `#0F172A` | — | 5.9:1 | ✅ AA |
| `#FFFFFF` on `#6366f1` button | — | 4.6:1 | ✅ AA |
| `#FFFFFF` on `#dc2626` danger | — | 5.1:1 | ✅ AA |
| `#64748b` meta on `#0F172A` | — | 3.8:1 | ⚠️ AA large text only |

> `#64748b` (`text.dark.disabled`) used for meta/timestamp text should be upgraded to `#9CA3AF` for body-size text to meet 4.5:1.

### ARIA / Accessibility props

Every interactive component must declare:

- `accessibilityRole` — `"button"`, `"link"`, `"tab"`, etc.
- `accessibilityLabel` — human-readable description (never rely on visual-only context)
- `accessibilityState` — `{ disabled, selected, busy }` as appropriate

Error states must use `accessibilityRole="alert"` (see `ConnectScreen` error box).

### Screen reader behaviour

| Component | Expected announcement |
|---|---|
| WalletButton (connecting) | "Loading" via `ActivityIndicator` |
| Header wallet pill | "Connected wallet GABC…K2" or "Open wallet connection screen" |
| PoolRow | "Open [name] pool, button" |
| ProfileRow | "Open [username] profile, button" |
| EmptyState | Title + description read in sequence |

---

## 6. Dark Mode Guidelines

The app is **dark-first** — `#0F172A` (`color.surface.dark.background`) is the default screen background. There is no light-mode toggle at this time.

### Rules

1. **Never hard-code `#ffffff` as a card background** on dark screens. Use `color.surface.dark.surface-1` (`#1E293B`) for elevated surfaces.
2. **PoolCard exception:** `PoolCard.tsx` currently uses light-mode colours (`#ffffff` background, `#1a1a1a` text). This must be updated to dark tokens before the Pools screen is fully implemented.
3. **Skeleton shimmer** uses `color.surface.dark.surface-2` (`#334155`) as the base and a lighter pulse overlay.
4. **Brand colours** (`#7C3AED`, `#06B6D4`, `#F59E0B`) are the same in both modes — they are pre-tested for contrast on dark backgrounds.
5. **Status colours** (`semantic.success`, `semantic.error`, `semantic.warning`) are unchanged in dark mode.

### Token overrides for future light-mode support

If a light mode is added, swap the following per `docs/design/README.md`:

| Token | Light value | Dark value (current) |
|---|---|---|
| `surface.background` | `#FFFFFF` | `#0F172A` |
| `surface.surface-1` | `#F9FAFB` | `#1E293B` |
| `surface.surface-2` | `#F3F4F6` | `#334155` |
| `surface.border` | `#E5E7EB` | `#334155` |
| `text.primary` | `#111827` | `#F9FAFB` |
| `text.secondary` | `#6B7280` | `#9CA3AF` |
