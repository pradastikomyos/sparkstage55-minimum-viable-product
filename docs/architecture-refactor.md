# Architecture Refactor: SparkStage55

## Root Cause

The bug where `/my-orders` page's arrow/logo had `pointer-events: none` was caused by global CSS collision:

- `public/styles/shop.css` defines `.zara-header { pointer-events: none; }`
- `src/pages/MyOrdersPage.tsx` uses `<header className="zara-header">`
- All stylesheets in `public/styles/` are loaded globally via `<link>` tags in `index.html`
- This means page-specific classes like `.zara-header` from `shop.css` leak into every route

## Solution

Replace global page-specific CSS with CSS Modules. Each visual route/component owns its CSS via `*.module.css` files. Global CSS is restricted to reset, tokens, fonts, and root variables.

## Target Architecture

Hybrid Feature-Sliced Design + Bulletproof React:

```
src/
  app/         — app shell: router, providers, layouts, global styles
  pages/       — route entry points, compose widgets + features
  widgets/     — self-contained UI widgets (headers, overlays, footers)
  features/    — business features (auth, cart, checkout, search, navigation)
  entities/    — domain models (product, cart, order, user)
  shared/      — reusable UI, lib, hooks, types, config
```

## Non-Negotiable Rules

1. No page-specific CSS in `public/styles/`
2. No generic reusable class names like `.zara-header`, `.zara-sidebar`
3. No page component should import CSS from another page
4. Every component owns its CSS via `*.module.css`
5. Global CSS only for reset, tokens, fonts, root variables
6. Overlays are widgets, not page internals
7. Header variants are explicit components
8. Route layouts are explicit
9. Business/data logic goes to features/entities layers
10. Import direction: app -> pages -> widgets -> features -> entities -> shared
