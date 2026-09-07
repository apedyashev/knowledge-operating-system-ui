# AGENTS.md

This document defines engineering standards for contributors and AI agents working in this repository.

## Project Context

- Product: Knowledge Operating System (KOS) UI MVP
- Frontend stack: Angular 20, TypeScript 5.9, RxJS 7.8, Tailwind CSS v4
- Workspace structure:
  - `docs/` for specs and architecture blueprints
  - `kos-ui/` for the Angular application

Primary source of product behavior: `../docs/kos_mvp_engineering_blueprint.md`.

## Mission

Build a keyboard-first, context-rich knowledge workspace that feels like an IDE, not a dashboard app.

Priorities:

1. Fast navigation
2. Context preservation
3. Predictable architecture
4. Accessible UX
5. Maintainable code

## Non-Negotiable Rules

1. Keep changes scoped and minimal. Do not refactor unrelated areas.
2. Do not break route contracts from the blueprint (`/`, `/node/:id`, `/graph/:id`).
3. Prefer standalone Angular APIs and modern patterns (signals, functional providers).
4. Keep UI behavior keyboard-accessible.
5. Add or update tests for all meaningful behavior changes.
6. Never hardcode API URLs in components.
7. Never use `any` unless there is a documented, temporary migration reason.

## Development Commands

Run all frontend commands inside `kos-ui/`.

- Install: `npm install`
- Dev server: `npm run start`
- Build: `npm run build`
- Watch build: `npm run watch`
- Unit tests: `npm run test`

Before submitting work, run at least build + tests.

## Recommended App Architecture

Target structure in `kos-ui/src/app/`:

- `core/`
  - app-wide singletons, HTTP config, global services, layout shell
- `features/`
  - vertical slices (`dashboard`, `node`, `graph`, `search`, `relationships`)
- `shared/`
  - reusable presentational components, UI primitives, models, utility functions

Rules:

1. Keep feature logic inside feature folders.
2. Put cross-feature infrastructure in `core/`.
3. Keep `shared/` dependency-light and reusable.
4. Avoid circular dependencies.

## Angular Best Practices

### Components

1. Default to standalone components.
2. Use `ChangeDetectionStrategy.OnPush` for all non-trivial components.
3. Keep components focused:
   - container components orchestrate data
   - presentational components render UI + emit events
4. Keep template logic simple; move computed state to signals/computed values.
5. Use typed `@Input()` and `@Output()` APIs (or signal-based equivalents).

## Commenting Standards

1. Always write explanatory comments that help a person learning Angular understand what is being done and why.
2. Prefer short comments above non-obvious logic, lifecycle behavior, RxJS streams, routing decisions, and state transitions.
3. Explain intent and tradeoffs, not just what the line literally does.
4. Keep comments up to date when code changes; outdated comments are treated as defects.

### State Management: Signals vs. Reactive Programming

This project uses **both** signals and RxJS observables intentionally to support learning and match appropriate architectural patterns. Keep them **strictly separated** by layer to maintain clarity.

#### When to Use Angular Signals

Use signals for **local, synchronous state** in these layers:

1. **Presentational Components** (`features/*/components/`, `shared/ui/`)
   - Simple UI state: `isOpen`, `activeTab`, `hoveredItem`
   - Form field values and validation states
   - Local animation or temporary UI states

2. **Page/Container Components** (`features/*/pages/`)
   - Derived UI state via `computed()`
   - View model transformations (e.g., formatting data for display)
   - Local navigation or tab management state

3. **Senior-Level Pattern (Production-Grade):**

   ```typescript
   import {
     Component,
     input,
     output,
     signal,
     computed,
     effect,
     ChangeDetectionStrategy,
     inject,
   } from '@angular/core';
   import { toSignal } from '@angular/core/rxjs-interop';
   import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

   @Component({
     selector: 'app-item-selector',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
     template: `
       <div>{{ itemName() }}</div>
       <button (click)="handleSelect()">Select</button>
     `,
   })
   export class ItemSelectorComponent {
     // Modern signals: input() instead of @Input()
     item = input<Item | null>(null);
     onItemSelected = output<Item>();

     // Private internal state
     #isLoading = signal(false);
     #error = signal<string | null>(null);

     // Public readonly access
     isLoading = this.#isLoading.asReadonly();
     error = this.#error.asReadonly();

     // Derived state (memoized automatically)
     itemName = computed(() => this.item()?.name ?? 'Unknown');

     // Inject services
     private readonly myService = inject(MyService);

     constructor() {
       // Reactive side effects: subscribe to input changes
       effect(() => {
         const currentItem = this.item();
         if (currentItem) {
           this.#loadItemDetails(currentItem.id);
         }
       });
     }

     #loadItemDetails(id: string): void {
       this.#isLoading.set(true);
       this.#error.set(null);

       this.myService
         .getDetails(id)
         .pipe(
           takeUntilDestroyed(), // Auto cleanup
           finalize(() => this.#isLoading.set(false)),
         )
         .subscribe({
           next: () => {
             /* handle success */
           },
           error: (err) => this.#error.set(err.message),
         });
     }

     handleSelect(): void {
       const current = this.item();
       if (current) {
         this.onItemSelected.emit(current);
       }
     }
   }
   ```

   **Key Production Patterns:**
   - Use `input()` / `output()` functions (Angular 14+)—cleaner than `@Input()` / `@Output()`
   - Private signals with `asReadonly()` prevents accidental external mutations
   - `computed()` automatically memoizes derived values; no need for manual `OnPush` tricks
   - `effect()` for reactive side effects (replaces `ngOnChanges` and manual subscriptions)
   - `takeUntilDestroyed()` for automatic cleanup (no more `unsubscribe()` boilerplate)
   - `ChangeDetectionStrategy.OnPush` for optimal performance
   - Use `finalize()` operator to reset loading state

#### When to Use RxJS Observables (Reactive Programming)

Use RxJS for **async operations, server state, and event streams** in these layers:

1. **Services** (`core/services/`, `features/*/services/`)
   - HTTP requests and server communication
   - Event streaming and polling
   - Complex async workflows requiring composition (switchMap, concatMap, etc.)

2. **Layout/Shell Components** (`core/layout/`)
   - Complex event-driven interactions (search, filters, navigation state)
   - State that flows between multiple child components

3. **Senior-Level Service Pattern (Production-Grade):**

   ```typescript
   import { Injectable, inject } from '@angular/core';
   import { HttpClient } from '@angular/common/http';
   import { Observable, Subject, BehaviorSubject, throwError } from 'rxjs';
   import {
     switchMap,
     map,
     debounceTime,
     distinctUntilChanged,
     retry,
     catchError,
     tap,
     shareReplay,
   } from 'rxjs/operators';

   @Injectable({ providedIn: 'root' })
   export class NodeSearchService {
     private readonly http = inject(HttpClient);

     // Private subjects drive the stream
     private readonly searchTerm$ = new Subject<string>();

     // Public observable: cold until subscribed, replayed to late subscribers
     readonly searchResults$ = this.searchTerm$.pipe(
       debounceTime(300),
       distinctUntilChanged(),
       switchMap((term) => this.#performSearch(term)),
       shareReplay(1), // Cache last result; replay to late subscribers
     );

     // Expose the input stream (component will call next())
     search(term: string): void {
       this.searchTerm$.next(term);
     }

     // Actual HTTP call with proper error handling
     #performSearch(term: string): Observable<NodeSearchResult[]> {
       if (!term.trim()) {
         return of([]);
       }

       return this.http
         .get<NodeSearchResult[]>('/api/search', {
           params: { q: term },
         })
         .pipe(
           retry({ count: 2, delay: 1000 }),
           map((results) => this.#normalizeResults(results)),
           catchError((err) => {
             console.error('Search failed:', err);
             return throwError(() => new Error('Search service unavailable'));
           }),
         );
     }

     // Pure helper: transform server DTOs to view models
     #normalizeResults(results: any[]): NodeSearchResult[] {
       return results.map((r) => ({
         id: r.id,
         title: r.title,
         preview: r.preview ?? '',
       }));
     }
   }
   ```

   **Senior-Level RxJS Patterns:**
   - **Lazy observable**: Service returns a cold observable (computed on each subscription)
   - **Subject steering**: Private `Subject` drives logic; public observable exposes results
   - **Operator composition**: Chain operators clearly: debounce → distinctUntilChanged → switchMap
   - **shareReplay(1)**: Cache last result; multicast to multiple subscribers (avoids duplicate requests)
   - **retry()**: Resilience built in; configurable retry logic
   - **Error handling**: Explicit `catchError` with proper error transformation
   - **Pure helpers**: Separate `#normalizeResults()` for DTOs→view models (testable, reusable)
   - **Documentation**: Comments explain _why_ (not just what code does)

4. **Senior-Level Component Pattern (Consuming RxJS):**

   ```typescript
   import { Component, ChangeDetectionStrategy, inject, OnInit } from '@angular/core';
   import { toSignal } from '@angular/core/rxjs-interop';
   import { NodeSearchService } from '#core/services/node-search.service';

   @Component({
     selector: 'app-search-field',
     standalone: true,
     changeDetection: ChangeDetectionStrategy.OnPush,
   })
   export class SearchFieldComponent {
     private readonly searchService = inject(NodeSearchService);

     // Convert observable to signal (best of both worlds)
     searchResults = toSignal(this.searchService.searchResults$, {
       initialValue: [],
     });

     // Drive search from user input
     onSearchInput(term: string): void {
       this.searchService.search(term);
     }
   }
   ```

   **Pattern Benefit:** Convert RxJS to signals at component boundary (`toSignal()`) for simple, synchronous template bindings.

#### Architectural Boundaries (Reference)

| Layer                       | Pattern                                              | Example                                               |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| **core/services/**          | RxJS (cold observables, Subject-driven, shareReplay) | `NodeSearchService`, `NodeApiService`                 |
| **core/layout/components/** | Signals + toSignal() bridging RxJS                   | `SearchField` converts service observables to signals |
| **features/\*/services/**   | RxJS (same as core)                                  | Feature data fetching, business logic                 |
| **features/\*/pages/**      | Signals + effect() for side effects                  | Container components coordinating feature data        |
| **features/\*/components/** | Signals only                                         | Presentational UI components                          |
| **shared/ui/components/**   | Signals only                                         | Reusable buttons, cards, modals, etc.                 |

**Key Insight:** Modern Angular prefers signals in components + RxJS in services, bridged with `toSignal()` at component boundaries.

#### Learning & Transition Rules

- **Services own observables, components own signals:** Services return cold observables. Components convert to signals with `toSignal()` for simpler template bindings.
- **No async pipe in component templates:** Components should use signals exclusively in templates. Use `toSignal()` at the boundary to avoid async pipe complexity.
- **One pattern per state concept:** Never mix signals and observables for the same piece of state.
- **Always use `takeUntilDestroyed()` or `finalize()`:** Prevents memory leaks in effects and subscriptions.
- **Use `effect()` instead of `ngOnInit` + subscribe:** Modern way to handle reactive side effects.
- **Test services with marble testing:** RxJS services should use rxjs marble testing patterns (jasmine-marbles).
- **Test signal-based components synchronously:** Signal-based components are simpler to test; no flushing needed.
- **Private signals prevent accidental mutations:** Use `#signal` + `asReadonly()` for component encapsulation.

#### Existing Example: SearchField (Reactive)

The `core/layout/components/search-field/` component currently uses the reactive pattern (observables + async pipe). It demonstrates:

- Event stream: `searchTerm$` (EventEmitter)
- Derived stream: `searchResults$` (with debounce, distinctUntilChanged, switchMap, error handling)
- Template: Uses async pipe to unwrap the observable

**Learning value:** Shows how RxJS operator composition works. **Future refactor:** Could convert to `toSignal()` at the boundary for simpler template logic (this is the modern trend).

#### Summary Table: Choose Your Pattern

| Question                                    | Use Signals                     | Use RxJS                   |
| ------------------------------------------- | ------------------------------- | -------------------------- |
| State changes synchronously?                | ✅                              | ❌                         |
| Needs debouncing, throttling, or retries?   | ❌                              | ✅                         |
| HTTP request involved?                      | ❌                              | ✅                         |
| Multiple event sources to merge?            | ❌                              | ✅                         |
| Simple UI toggle or form field?             | ✅                              | ❌                         |
| Complex async workflow?                     | ❌                              | ✅                         |
| Shared state across many components?        | Service + signals via injection | ✅ Service owns observable |
| Writing component code (template bindings)? | ✅ Always signals               | ❌ Use toSignal() instead  |

### Routing

1. Define routes in feature route files when route count grows.
2. Lazy-load major feature areas where reasonable.
3. Keep route params typed and validated.
4. Preserve deep-link behavior for key screens.

### Services and API Layer

1. Components must not call `HttpClient` directly.
2. Use dedicated API services in `core/api/` or feature-level data services.
3. Define request/response DTO interfaces in `shared/models/` or feature models.
4. Map transport DTOs to UI view models where needed.
5. Centralize error handling patterns.

### Forms

1. Use reactive forms for non-trivial forms.
2. Keep validators explicit and typed.
3. Show actionable validation messages.
4. Prevent silent save failures.

### Error and Loading UX

1. Every async view should represent loading, success, and error states.
2. Never swallow errors; log with context and display user-safe feedback.
3. Keep retry flows obvious when possible.

## Tailwind CSS Best Practices (v4)

1. Use utility classes in templates for speed, but avoid unreadable class walls.
2. Extract repeated class sets into semantic component classes in CSS when reused.
3. Prefer design tokens via CSS variables for colors, spacing, radius, and typography.
4. Keep spacing and sizing consistent using a constrained scale.
5. Avoid arbitrary values unless there is a real design/system need.
6. Use responsive variants intentionally; mobile-first by default.
7. Do not rely on color alone to communicate state.

### Design System Color Palette

Use the following palette consistently across the UI. Prefer mapping these values to CSS variables in `src/styles.css` and reference the variables in Tailwind-compatible styles.

- Primary: `#5261A3`
- Surface: `#DDE0EE`
- Accent-muted: `#A0A9CF`
- Accent-active: `#65A6C3`

Styling strategy:

- Global tokens and base styles: `src/styles.css`
- Component-specific styling: component stylesheet when truly local
- Shared primitives: reusable classes/components in `shared/ui/`

## Accessibility and Keyboard UX

1. All interactive elements must be reachable via keyboard.
2. Provide visible focus states.
3. Use semantic HTML before ARIA.
4. Add ARIA labels only where semantics are insufficient.
5. Verify color contrast for text and controls.
6. Ensure command flows support:
   - open search (`Cmd/Ctrl + K`)
   - keyboard navigation in results
   - escape to close overlays

## Performance Standards

1. Lazy-load heavy features.
2. Track list rendering with stable identity (`trackBy`/`track`).
3. Avoid expensive computations inside templates.
4. Debounce high-frequency search input.
5. Keep bundle growth under control and watch Angular build budgets.

## Testing Standards

1. Unit test every service with meaningful branching logic.
2. Component tests should cover user behavior, not implementation details.
3. Add regression tests for bug fixes.
4. Mock network boundaries, not internal pure logic.
5. Keep tests deterministic and fast.

Minimum before merge:

1. `npm run build` passes
2. `npm run test` passes
3. New logic has tests or documented justification

## Code Quality Conventions

1. Use strict typing and narrow types early.
2. Prefer immutable updates for state transitions.
3. Keep functions small and intention-revealing.
4. Name by domain meaning, not by UI position.
5. Document non-obvious decisions in concise comments.
6. Keep imports clean and remove dead code.

## Security and Data Hygiene

1. Treat all backend input as untrusted.
2. Sanitize/escape rendered external content where relevant.
3. Never commit secrets, tokens, or credentials.
4. Use environment-based configuration for host URLs and flags.

## Implementation Workflow for Agents

For each task:

1. Read relevant blueprint section in `docs/` before coding.
2. Implement smallest complete vertical slice.
3. Add/adjust tests.
4. Run build and tests.
5. Summarize what changed, why, and any remaining risks.

If requirements are ambiguous, preserve current behavior and document assumptions in the final note.

## MVP Feature Prioritization

Follow this order unless explicitly overridden:

1. Application shell (top bar, left sidebar, main editor area, right context sidebar)
2. Static node screen mock with realistic data
3. Search overlay + keyboard interactions
4. Local mock state using signals/services
5. Backend integration
6. UX polish

## Definition of Done

A task is done only if:

1. Behavior matches blueprint intent
2. Code follows structure and naming conventions
3. Accessibility and keyboard flows are preserved
4. Build and tests pass locally
5. Changes are documented clearly for the next contributor
