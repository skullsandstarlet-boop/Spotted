# React Native Starter Template

Expo Router starter template used by Appifex AI generation.

## UI Baseline

- React Native Paper (MD3) for consistent production UI components
- `StyleSheet` for layout and screen-level styles
- No NativeWind/Tailwind configuration in the baseline template
- Light mode by default (`app.json` uses `userInterfaceStyle: "light"`)

## Purpose

This template is the baseline for generated mobile apps. Keep it opinionated and safe so generated projects inherit correct navigation and non-placeholder screen quality.

## File Structure

```text
app/
  _layout.tsx            # Root stack + system wrappers (Sentry, ErrorBoundary, floating button)
  index.tsx              # REQUIRED: redirects to /(tabs)
  +not-found.tsx         # Not found screen
  (tabs)/
    _layout.tsx          # Tabs navigator with initialRouteName="index"
    index.tsx            # Default Home tab with real baseline content
theme/
  paperTheme.ts          # Shared React Native Paper MD3 theme
```

## Critical Rules for Generation

1. `app/index.tsx` must always exist.
2. Root `app/_layout.tsx` must register both `index` and `(tabs)` screens.
3. `app/(tabs)/_layout.tsx` must use `Tabs` with `initialRouteName="index"` and Ionicons for `tabBarIcon`.
4. Do not ship placeholder tabs.
5. If a tab has no meaningful content yet, remove it from `<Tabs.Screen>` until implemented.
6. Keep at most 6 visible tab items in the bottom tab bar.

## Quality Gate (Must Pass)

- No tab screen renders only centered label text.
- Every `<Tabs.Screen name="...">` has a matching file in `app/(tabs)/`.
- Every tab has a real content section (cards, lists, forms, CTA, or data state).
- At least 2 visible tabs — a single tab with a visible tab bar looks broken (the template auto-hides the bar, but always design for 2+).
- No `height`/`paddingBottom` overrides on `tabBarStyle`.
- No more than 6 visible tab items (`options={{ href: null }}` routes do not count as visible tabs).

## Extension Workflow

1. Create the new tab screen file in `app/(tabs)/<name>.tsx` with real content.
2. Add matching `<Tabs.Screen name="<name>" ... />` in `app/(tabs)/_layout.tsx`.
3. Add nested stack folders only when needed, each with its own `_layout.tsx`.
4. Verify navigation and tab behavior on iOS and Android simulators.

## Local Commands

```bash
npm install
npx expo start
```

## Generation Gate

Appifex QA enforces tab quality and tab-structure consistency during post-generation verification.

- Fails if any tab screen is placeholder-only.
- Fails on tab structure mismatches (`Tabs.Screen` vs `app/(tabs)/*.tsx`, `initialRouteName` mismatch, orphan tab files, >6 visible tabs).
- Generation should only pass when QA guardrails report no tab-content violations.

## References

- https://docs.expo.dev/
- https://docs.expo.dev/router/introduction/
- https://docs.expo.dev/versions/latest/sdk/reanimated/
- https://callstack.github.io/react-native-paper/
