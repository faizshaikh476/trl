# Mobile Side Navigation Design

## Goal

Give Super Admin and broker users complete, usable navigation on screens below the existing `lg` desktop breakpoint without changing either desktop sidebar or mixing role-specific routes.

## Interaction

- Replace the mobile Sign out shortcut with a clearly labelled menu button.
- Open a left-side modal drawer with the current product branding, every route available to the current role, the active route highlighted, and Sign out anchored at the bottom.
- Close the drawer when a navigation link is selected, the backdrop is pressed, the close button is pressed, or Escape is pressed.
- Rely on the existing Base UI sheet primitive for focus trapping, accessible dialog semantics, and focus restoration.

## Architecture

`MobileSideNavigation` is a focused Client Component that owns only drawer state and close behavior. The existing async `AdminShell` and `AppShell` stay Server Components and pass their already-authorized navigation markup, branding, and sign-out control as renderable props. This keeps Firebase and platform-branding work outside the client bundle and prevents admin links from appearing in the broker shell.

## Visual Treatment

The drawer mirrors each desktop sidebar: slate/cyan for Super Admin and stone/black (or zinc for dark tone) for brokers. It uses the same active state, spacing, icons, and typography as desktop so mobile feels like the same product rather than a second navigation system.

## Verification

- Component tests prove the menu is absent while closed, opens from the labelled button, and closes after a route is chosen.
- Browser checks cover both `/admin/workspaces` and `/dashboard` at a 390 px viewport.
- Existing focused tests, lint, build, and `git diff --check` must pass before production deployment.

