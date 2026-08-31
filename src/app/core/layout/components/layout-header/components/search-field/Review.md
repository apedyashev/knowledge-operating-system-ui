# Search Field Code Review

## Context

This review covers the search field and search overlay. The product blueprint
requires an overlay opened with `Cmd/Ctrl + K`, instant results, keyboard
navigation, and `Escape` to close it.

The review intentionally focuses on Angular and RxJS patterns without Signals.
Work through the items in priority order; each item is intended to be a small,
independent change with a regression test.

## 1. Replace independent subscriptions with one RxJS search pipeline

**Priority:** High

### Current behavior

`debouncedSearch` calls `searchNodes(...).subscribe(...)` for every emitted
term. If the user types `ang` and then `angular`, the request for `ang` can
finish after the request for `angular` and overwrite the newer results.

### Why this matters

The displayed result list must represent the current query, not the most recent
network response. Network requests do not reliably finish in the order in which
they were sent.

### What to learn

Model the feature as a stream:

```text
input events -> search terms -> debounced terms -> HTTP result list
```

Use a `Subject<string>` for terms and `switchMap` for the HTTP request.
`switchMap` unsubscribes from the previous search Observable when a new term
arrives. That makes previous responses irrelevant to the UI.

### How `searchTerms$` receives values

`searchTerms$` is a `Subject`. Think of it as an event channel owned by the
component: calling `.next(value)` puts a new value into that channel.

The existing template already calls `onSearchInput($event)` for every user
input event:

```html
<input (input)="onSearchInput($event)" />
```

Change that handler so it reads the text field's current value and forwards it
to the Subject. This is the missing connection from the browser event to RxJS:

```ts
onSearchInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.searchTerm = input.value;
  this.searchChange.emit(this.searchTerm);
  this.searchTerms$.next(this.searchTerm);
}
```

When a user types `a`, then `n`, then `g`, Angular calls this method three
times. The component calls `.next('a')`, `.next('an')`, and `.next('ang')`.
The pipeline below receives these values. `debounceTime(300)` waits until the
user stops typing for 300 ms; only then does `switchMap` call the API.

### Suggested shape

```ts
private readonly searchTerms$ = new Subject<string>();

readonly searchResults$ = this.searchTerms$.pipe(
  map((term) => term.trim()),
  debounceTime(300),
  distinctUntilChanged(),
  switchMap((term) =>
    term === ''
      ? of([])
      : this.nodeSearchService.searchNodes(term).pipe(
          catchError(() => of([]))
        )
  )
);
```

### Every operator in this pipeline

Read `pipe(...)` from top to bottom. Each operator receives values from the
previous line and produces values for the next line.

#### `pipe(...)`

`pipe` chains Observable operators. It does not start a search by itself. The
chain starts processing only when something subscribes, which will be Angular's
`AsyncPipe` in this design.

Input: the `string` values sent through `searchTerms$`.

Output: an `Observable<NodeSearchResult[]>` named `searchResults$`.

#### `map((term) => term.trim())`

`map` transforms every value but keeps one output value for each input value.
Here it removes whitespace at both ends of the search text.

```text
' angular ' -> 'angular'
'   '       -> ''
```

This is needed so whitespace-only input is treated as an empty search and so
the API receives a normalized search term.

#### `debounceTime(300)`

`debounceTime` waits until no new value has arrived for 300 milliseconds. If a
new value arrives during that wait, the timer for the old value is cancelled.

```text
0 ms:   'a'
80 ms:  'an'
160 ms: 'ang'
460 ms: emits 'ang'
```

This is needed to avoid an HTTP request for each keystroke. It replaces both
existing Lodash debounce implementations; do not keep a second debounce.

#### `distinctUntilChanged()`

`distinctUntilChanged` suppresses a value only when it is identical to the
immediately preceding emitted value.

```text
'angular', 'angular', 'rxjs', 'angular'
-> 'angular',            'rxjs', 'angular'
```

It is optional. Its purpose is to avoid a duplicate request when the same
normalized term is emitted twice in a row. It does not prevent a later search
for `angular` after the user searched for a different term in between.

#### `switchMap((term) => ...)`

`switchMap` converts each search-term value into a new inner Observable and
subscribes to the latest one. In this code, the inner Observable is either an
empty result list from `of([])` or an HTTP request from `searchNodes(term)`.

When a new term arrives, `switchMap` unsubscribes from the old inner Observable
before subscribing to the new one. HTTP requests made through Angular
`HttpClient` are cancelled when their subscription is cancelled.

```text
'ang'     -> starts request A
'angular' -> cancels request A and starts request B
```

This is required for typeahead search. It prevents an old, slower response from
replacing the results for the newer query. Do not use `mergeMap` here: it keeps
all requests active and allows out-of-order responses to update the UI.

#### `of([])`

`of` creates an Observable that immediately emits the given value, then
completes. Here `of([])` emits an empty `NodeSearchResult[]` for an empty term.

It is needed because both branches of `switchMap` must return an Observable.
It also expresses the desired behavior clearly: clearing the search field
clears the result list without calling the API.

#### `catchError(() => of([]))`

`catchError` receives an error from the Observable before it and replaces that
failed Observable with a fallback Observable. Here, a failed HTTP request is
replaced by `of([])`, so the UI receives an empty list.

It is needed to keep `searchResults$` alive. Without it, one failed request
would error and terminate the complete stream; future calls to
`searchTerms$.next(...)` would no longer start searches. When implementing item
5, replace the empty-list fallback with a typed error state so users can see
that the search failed.

Prefer consuming `searchResults$` with Angular's `AsyncPipe` in the template.
The async pipe owns the subscription lifecycle, so the component does not need
to manually unsubscribe.

### Supporting RxJS and Angular APIs

`Subject<string>` is not an operator. It is a manually controlled Observable:
`searchTerms$.next('angular')` sends a string into the pipeline.

`AsyncPipe` is not an RxJS operator. It is Angular's template pipe. It
subscribes to `searchResults$`, renders each emitted value, and automatically
unsubscribes when the component is destroyed.

The component needs `Subject`, `of`, `catchError`, `debounceTime`,
`distinctUntilChanged`, `map`, and `switchMap` from `rxjs`, plus `AsyncPipe`
from `@angular/common` in its standalone `imports` array.

### Acceptance criteria

- A later query cannot be overwritten by an older HTTP response.
- Only one debounce exists in the complete input-to-request path.
- Destroying the component does not leave a manual subscription behind.
- Add a test that emits two terms and verifies the newer result list wins.

## 2. Remove the duplicated and ineffective Lodash debounce

**Priority:** High

### Current behavior

`onSearchInput` creates a new `_.debounce` function on every input event and
invokes it immediately. A debounce can only cancel calls made through the same
function instance, so these newly created functions cannot cancel one another.
The second debounce in `debouncedSearch` then adds another 500 ms delay.

### Why this matters

The UI can wait approximately one second before showing results, contrary to
the blueprint's instant-search goal. It also makes timing hard to test.

### Suggested change

Make `onSearchInput` synchronous and push the value to `searchTerms$`:

```ts
onSearchInput(event: Event): void {
  const input = event.target as HTMLInputElement;
  this.searchTerms$.next(input.value);
}
```

Keep `debounceTime` inside the pipeline from item 1. RxJS operators describe
the asynchronous behavior in one place and work naturally with Angular tests.

### Acceptance criteria

- `lodash` is no longer needed by this component.
- One input burst produces one API call after the configured debounce time.
- The existing CommonJS optimization warning for `lodash` disappears.

## 3. Do not request or save empty search terms

**Priority:** Medium

### Current behavior

`applyChangedSearchTerm` calls the search API even for `''` or whitespace.
Successful empty searches are also saved as recent searches.

### Suggested change

Normalize the term once with `trim()`. For an empty term, emit an empty result
list and show recent searches, but do not call the API and do not persist it.

### Acceptance criteria

- Clearing the field causes no HTTP request.
- Whitespace-only input causes no HTTP request.
- Recent searches contain only non-empty, normalized terms.
- Add tests for both empty and whitespace-only input.

## 4. Make recent searches and last viewed nodes reactive

**Priority:** Medium

### Current behavior

`fakeRecentSearches` and `lastViewedNodes` are arrays read from `localStorage`
at specific points in time. After adding a recent search, `fakeRecentSearches`
is not refreshed, so the overlay may show stale data.

`addRecentSearch` also does not move a repeated search to the front. Once five
different terms have been stored, additional searches are discarded.

### What to learn

`localStorage` is only persistence, not application state. A service can keep a
`BehaviorSubject` as the current state and write each update to `localStorage`.
A `BehaviorSubject` is useful here because new overlay subscribers immediately
receive the current list.

### What to change, step by step

#### Step 1: Define one shared type for recently viewed nodes

`RecentActivityService` currently repeats `{ id: string; title: string }`.
Import `NodeSearchResult` instead, because the search API result and a recently
viewed node have the same UI shape.

```ts
import { BehaviorSubject } from 'rxjs';
import { NodeSearchResult } from './node-search.service';
```

`BehaviorSubject` is not an operator. It stores one current value and emits it
immediately to every new subscriber. That matters because the overlay may open
after the service was created; it must still receive the existing recent items.

#### Step 2: Make the service own the current arrays

In `RecentActivityService`, replace snapshot-only reads with two private
`BehaviorSubject`s and expose each one as a read-only Observable. The component
can observe the values but cannot call `.next(...)` and change shared state.

```ts
private readonly recentSearchesSubject = new BehaviorSubject<string[]>(
  this.readRecentSearches()
);
private readonly lastViewedNodesSubject = new BehaviorSubject<NodeSearchResult[]>(
  this.readLastViewedNodes()
);

readonly recentSearches$ = this.recentSearchesSubject.asObservable();
readonly lastViewedNodes$ = this.lastViewedNodesSubject.asObservable();
```

`asObservable()` is not an operator. It returns a read-only Observable view of
the subject. Consumers can subscribe, but they cannot mutate the service's
state with `.next(...)`.

Rename the current public getter methods to private persistence helpers:

```ts
private readRecentSearches(): string[] { /* localStorage read */ }
private readLastViewedNodes(): NodeSearchResult[] { /* localStorage read */ }
```

Keep JSON parsing defensive: invalid or missing browser storage should become an
empty list, not an application crash.

#### Step 3: Update recent searches immutably and emit them

Replace `addRecentSearch` with this behavior:

```ts
addRecentSearch(searchTerm: string): void {
  const normalizedTerm = searchTerm.trim();
  if (normalizedTerm === '') {
    return;
  }

  const updatedSearches = [
    normalizedTerm,
    ...this.recentSearchesSubject.value.filter((term) => term !== normalizedTerm)
  ].slice(0, 5);

  localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
  this.recentSearchesSubject.next(updatedSearches);
}
```

`filter(...)` is an array method, not an RxJS operator. It creates a new array
without the earlier duplicate. The following array literal places the newest
term first. `slice(0, 5)` retains the five newest items.

`BehaviorSubject.value` reads the current service state. `.next(updatedSearches)`
publishes the replacement array to every active subscriber. Do not use
`push`, `unshift`, or `splice` on the subject's current array; immutable
replacement makes each state transition explicit and works reliably with
`OnPush` components.

#### Step 4: Update last viewed nodes with the same rule

The method has the same shape, but matches on `id` instead of the entire value:

```ts
addLastViewedNode(node: NodeSearchResult): void {
  const updatedNodes = [
    node,
    ...this.lastViewedNodesSubject.value.filter((item) => item.id !== node.id)
  ].slice(0, 5);

  localStorage.setItem('lastViewedNodes', JSON.stringify(updatedNodes));
  this.lastViewedNodesSubject.next(updatedNodes);
}
```

This corrects the current inconsistent limit: the comment says five entries,
but the implementation retains seven.

#### Step 5: Consume the service Observables in `SearchField`

Remove the component snapshot fields:

```ts
fakeRecentSearches = this.recentActivityService.getRecentSearches();
lastViewedNodes = this.recentActivityService.getLastViewedNodes();
```

Expose the service streams instead:

```ts
readonly recentSearches$ = this.recentActivityService.recentSearches$;
readonly lastViewedNodes$ = this.recentActivityService.lastViewedNodes$;
```

Then unwrap both values with `AsyncPipe` before passing them to the overlay:

```html
<app-search-overlay
  [recentSearches]="(recentSearches$ | async) ?? []"
  [lastViewedNodes]="(lastViewedNodes$ | async) ?? []"
  ...
/>
```

`AsyncPipe` subscribes to the Observable, updates the template after every
emission, and unsubscribes when `SearchField` is destroyed. The fallback
`?? []` is needed because `AsyncPipe` may return `null` before an Observable
emits. A `BehaviorSubject` emits synchronously on subscription, but the
fallback still keeps the child input type safe.

Once the template uses `lastViewedNodes$`, remove the manual refresh from
`showOverlay()`. Opening the overlay no longer needs to pull a snapshot because
the template already receives the current stream value.

#### Step 6: Test the service before changing the overlay

Add focused tests to `recent-activity.service.spec.ts`:

1. An empty or whitespace-only term is not persisted or emitted.
2. A new term is emitted first and written to `localStorage`.
3. Re-adding an existing term moves it to the first position without a duplicate.
4. Adding six distinct terms retains the latest five.
5. Re-visiting a node moves it to the front without duplicate IDs.
6. A subscriber to `recentSearches$` receives the current list immediately.

Use `localStorage.clear()` in each test setup and test the public methods and
public Observables. Do not test the private `read...` helpers directly.

### Target service API

```ts
readonly recentSearches$: Observable<string[]>;
readonly lastViewedNodes$: Observable<NodeSearchResult[]>;

addRecentSearch(searchTerm: string): void;
addLastViewedNode(node: NodeSearchResult): void;
```

For each insertion: remove the old matching item, prepend the new item, retain
only five entries, persist, and emit a new immutable array.

### Acceptance criteria

- A newly completed search appears in the overlay without reopening it.
- Repeating a search moves it to the top.
- The five newest entries are retained.
- Add focused unit tests to `RecentActivityService`.

## 5. Add a loading and an error state to the search experience

**Priority:** Medium

### Current behavior

The nested subscription handles only success. HTTP failures leave the user with
the previous result list and no explanation.

### Suggested change

Represent the complete request state, for example:

```ts
type SearchState =
  | { status: 'idle'; results: NodeSearchResult[] }
  | { status: 'loading'; results: NodeSearchResult[] }
  | { status: 'success'; results: NodeSearchResult[] }
  | { status: 'error'; results: NodeSearchResult[] };
```

Use `startWith` for loading and `catchError` for a user-safe error state. Keep
the error handling inside the RxJS pipeline rather than adding a second manual
subscription.

### Acceptance criteria

- The overlay shows that a request is loading.
- A failed request has a visible, user-safe error state.
- A failed request does not terminate the term stream; the next query works.

## 6. Make keyboard navigation accessible, not only visually highlighted

**Priority:** Medium

### Current behavior

The overlay tracks `activeLeftIndex` and `activeRightIndex`, but focus remains
in the input. The active entry has no `role="option"`, no selected state, and
the input has no `aria-activedescendant` relationship to it.

### Suggested change

Keep focus in the input, which is a good command-palette pattern, and expose
the virtual focus using the ARIA combobox/listbox model:

- Input: `role="combobox"`, `aria-expanded`, `aria-controls`, and
  `aria-activedescendant` while an item is active.
- Result container: `role="listbox"` with an ID.
- Each result: `role="option"`, a stable ID, and `aria-selected`.

Also ensure `Escape` closes the overlay, clears the active index, and returns
focus to a predictable place.

### Acceptance criteria

- Arrow keys update the active option consistently.
- Enter selects the active option.
- Screen readers can identify the active option.
- Add keyboard-event tests for arrows, Enter, and Escape.

## 7. Give keyboard-event ownership to one component

**Priority:** Medium

### Current behavior

Both `SearchField` and `SearchOverlay` register a `window:keydown` listener.
The search field opens and closes the overlay; the overlay handles navigation.
This distributes one interaction flow over two global event listeners.

### Suggested change

Keep `Cmd/Ctrl + K` on the persistent `SearchField`, because it exists even
while the overlay is closed. Route all overlay-specific keys (`Arrow*`, Enter,
Escape) through one handler in the visible overlay, or have the input emit
keyboard events directly to the parent. Avoid two listeners acting on the same
key unless their ordering is explicit and tested.

### Acceptance criteria

- Each keyboard shortcut has exactly one owner.
- Escape always closes once and leaves no stale active index.
- Tests document the intended shortcut ownership.

## 8. Configure component tests with mocked boundaries

**Priority:** High

### Current behavior

The SearchField test only checks creation and attempts to instantiate the real
`NodeSearchService`, which reaches `ApiService` and then `HttpClient`. The test
suite currently fails because `_HttpClient` is not provided.

### Suggested change

Provide test doubles for `NodeSearchService`, `RecentActivityService`,
`KnowledgeSpaceContextService`, and `Router`. Use `of(...)` for successful
Observable responses and a `Subject` when testing delayed or out-of-order
responses.

Do not use the real API service in a component test. The component's contract
is: it asks the search service for results and renders/reacts correctly.

### Minimum tests to add

- `Cmd/Ctrl + K` opens the overlay and focuses the input.
- Empty input does not call the search service.
- Debounced input calls the service once with the normalized term.
- A newer term replaces an older pending request.
- Selecting a node navigates to `/:space/node/:id`.
- Escape closes the overlay.
- ArrowDown plus Enter selects the highlighted item.

## 9. Apply Angular component conventions and clean up diagnostics

**Priority:** Low

### Current behavior

`SearchField` and `SearchOverlay` omit `ChangeDetectionStrategy.OnPush` even
though the repository requires it for non-trivial components. Debug
`console.log` calls remain in production code. `fakeRecentSearches` does not
describe that the data is real persisted application state.

### Suggested change

- Add `changeDetection: ChangeDetectionStrategy.OnPush` to both components.
- Remove debugging logs or replace unexpected-error logs with the project's
  established error-handling pattern.
- Rename `fakeRecentSearches` to `recentSearches`.
- Use consistently formatted imports and whitespace.

### Acceptance criteria

- Build has no search-field-specific CommonJS warning after item 2.
- No debugging output is emitted during normal search use.
- Names accurately describe their domain purpose.

## Validation Checklist

Run these after each independently completed item:

```bash
cd kos-ui
npm run test -- --watch=false --browsers=ChromeHeadless
npm run build
```

At the time of this review, the test command reports `3 FAILED, 4 SUCCESS`.
The immediate cause is `NG0201: No provider found for _HttpClient` while
creating `SearchField`; item 8 addresses that test setup defect.

The build succeeds, but it warns that the node-editor stylesheet exceeds its
component-style budget and that `lodash` is CommonJS. Item 2 removes the
search-field contribution to the `lodash` warning; the stylesheet budget is
outside this review's scope.