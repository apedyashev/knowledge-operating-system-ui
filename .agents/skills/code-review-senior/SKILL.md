# Code Review: Senior-Level Perspective

## Purpose

Perform expert-level code reviews that evaluate code quality from the perspective of an experienced developer. Reviews focus on architecture, maintainability, testability, performance, and best practices—not just obvious errors.

## Key Principles

- **Technology-Agnostic**: Review approach applies to any language or framework
- **Rules-Driven**: All technology/framework-specific best practices come from project documentation (AGENTS.md, copilot-instructions.md, or equivalent)
- **Senior Mindset**: Evaluate architectural decisions, scalability, and long-term maintenance
- **Learning-First**: For learning projects, help the developer understand *why* a pattern is better, not just *that* it's better
- **Fail Gracefully**: Stop review if required best-practice documentation is missing; guide the user to document rules first

## Activation Prompt

### Automatic Context Detection

Before reviewing, the skill automatically:

1. **Reads AGENTS.md** to extract:
   - Technology stack (e.g., "Angular 20, TypeScript 5.9")
   - Framework-specific best practices (state management, components, services)
   - Project learning goals (if defined)
   - Architectural layer structure (core/, features/, shared/)

2. **Analyzes file path** to detect:
   - Component type (service, presentational component, page, etc.)
   - Layer (core/services, features/*/components, shared/ui, etc.)
   - Whether rules are documented for this layer

3. **Applies matching rules** to the code review

### Simple Activation

Minimal syntax — context is auto-detected:

```
@codeReviewSenior [your code]
```

Or with specific focus:

```
@codeReviewSenior [your code] -- focus: performance, testability
```

### Full Format (Optional Override)

If you need to override auto-detection:

```
@codeReviewSenior

[Paste or reference your code]

**Context Overrides (optional):**
- File path: src/app/features/node/services/node-api.service.ts
- Learning goal: signals and effect() patterns
- Specific concerns: memory leaks, error handling
```

### What Gets Auto-Loaded from AGENTS.md

The skill checks for any documented sections matching these categories:

- **Technology Stack**: Extracted from tech stack declaration (e.g., "Frontend stack:", "Backend stack:")
- **Architectural Layers**: Rules for folder structure and layer separation (core/, features/, shared/, etc.)
- **State Management Patterns**: Whatever patterns the technology uses (signals, observables, reducers, etc.)
- **Component/Service Conventions**: Layer-specific architectural rules
- **Error Handling Standards**: How errors should be caught, logged, and handled
- **Testing Standards**: Unit test, integration test, and mock expectations
- **API/Framework-Specific Patterns**: Tool-specific best practices (decorators, operators, lifecycle methods, etc.)

If rules are missing for the detected layer + technology → Review stops with specific guidance.

## Review Workflow

### Step 1: Load & Validate Project Rules

1. **Read AGENTS.md** and extract:
   - Technology stack and versions
   - Framework-specific best practices for this technology
   - Architectural layer rules (core/, features/, shared/)
   - State management patterns (e.g., signals vs. RxJS)
   - Component/service conventions
   - Testing standards
   - Error handling guidelines

2. **Detect code layer** from file path:
   - Is it in `core/services/`? → Apply service patterns
   - Is it in `features/*/components/`? → Apply component patterns
   - Is it in `shared/ui/`? → Apply shared component rules
   - Is it in `features/*/pages/`? → Apply page/container rules

3. **Verify rules exist** for this layer and technology:
   - ✅ Rules found → Proceed to Step 2
   - ❌ Rules missing → **Stop and warn**:
   ```
   ⚠️ Code review stopped: Best-practice rules missing in AGENTS.md
   
   For [layer type] + [technology], I need documented rules:
   
   **Missing from AGENTS.md:**
   - State management patterns (architecture for stateful logic)
   - Component/service architectural guidelines
   - Error handling and resilience conventions
   - Testing standards and expectations
   
   **Action:** Add these sections to AGENTS.md:
   - Document how state should be managed (patterns, tools, conventions)
   - Show layer-specific architecture (services, components, containers)
   - Define error handling approach
   - Specify testing expectations with code examples
   
   Once rules are documented, I can review with full confidence.
   ```

### Step 2: Analyze Code Against Rules

For each rule category below, check the code:

#### Architecture & Design
- Does the code follow the layer structure (core/, features/, shared/)?
- Are responsibilities properly separated (services vs. components)?
- Are dependencies correctly directed (no circular imports)?
- Does it respect the documented pattern for this technology/layer?

#### State Management
- If stateful: Is the correct pattern used (signals vs. observables per AGENTS.md)?
- Are state transitions predictable and testable?
- Is there accidental mixing of patterns for the same concept?
- Is state encapsulation proper (private with readonly access)?

#### Error Handling & Resilience
- Are errors caught and handled explicitly?
- Is error information logged or displayed appropriately?
- Are edge cases (empty, null, invalid) handled?
- Is there retry logic where needed (especially in services)?

#### Testability
- Can the code be tested in isolation?
- Are dependencies injectable/mockable?
- Are side effects isolated from pure logic?
- Is the code deterministic (no hidden state)?

#### Performance
- Are expensive operations memoized (computed() or similar)?
- Is change detection optimized (OnPush strategy)?
- Are there N+1 queries or repeated subscriptions?
- Is memory being leaked (unsubscribed observables, missing cleanup)?

#### Naming & Readability
- Are names intention-revealing and domain-driven?
- Do comments explain *why*, not *what*?
- Is the code self-documenting?

#### Framework-Specific Patterns
- Are modern APIs used (input()/output() instead of @Input/@Output)?
- Are lifecycle hooks appropriate and documented?
- Are utility functions (takeUntilDestroyed, toSignal, etc.) used correctly?

### Step 3: Provide Learning-Focused Actionable Feedback

⚠️ **CRITICAL for Learning Projects**: Every finding must be a complete **step-by-step guide**, not just a problem statement.

For each finding, provide:

#### A. **Location & Context**
```
**Location:** [File path], line ~[line number]
**Code section:** [Show the exact code block with 3-5 lines context]
```

#### B. **What's the Problem?**
```
**The Problem:**
[Show the WRONG code in a code block]

**Why This Matters (Learning):**
- [Explain the architectural principle]
- Per [AGENTS.md section], [rule/pattern]
- [Describe the learning outcome]

**What You'll Learn:**
- Specific skill/pattern
- Why this matters in production
- How this relates to the project's architecture
```

#### C. **How to Fix It (Complete Step-by-Step)**

**Critical requirements:**
1. **Exact file paths** (workspace-relative)
2. **Line numbers or code context** (where to make changes)
3. **Complete BEFORE/AFTER code blocks** (not just snippets)
4. **Numbered steps** (1, 2, 3, etc.)
5. **All necessary imports** (what to add/remove)
6. **Explanation of each step** (why this step matters)

Example format:
```
**How to Fix It (Step-by-Step):**

**Step 1:** Open `src/app/core/services/search.service.ts`

**Step 2:** Find the import section at the top (lines 1-10):
[Show current imports with line context]

**Step 3:** Change the import from:
```typescript
import { EventEmitter } from '@angular/core';
```
To:
```typescript
import { Subject } from 'rxjs';
```

**Step 4:** Find the field declaration around line 30-35:
[Show current code with context]

**Step 5:** Replace:
```typescript
// BEFORE:
private readonly searchTerm$ = new EventEmitter<string>();

// AFTER:
private readonly searchTerm$ = new Subject<string>();
```

**Complete example (BEFORE):**
[Full code block showing the problem]

**Complete example (AFTER):**
[Full code block showing the solution]

**Verification:**
- Run: `npm run build` (should compile with no errors)
- Run: `npm run test` (should pass)
- Manual test: [describe how to verify the fix works]
```

#### D. **Learning Resources**
```
**AGENTS.md Reference:**
[Link the exact section of AGENTS.md that documents this pattern]

**After Fixing This, Read:**
[Suggest AGENTS.md sections to deepen understanding]

**Questions to Think About:**
1. [Question 1]
2. [Question 2]
3. [Question 3]
```

#### E. **Impact & Priority**
```
**Impact:** [Scope of change]
**Effort:** [Time estimate: 5 min, 15 min, etc.]
**Priority:** 🔴 High | 🟡 Medium | 🟢 Low
**Status:** 📝 TODO | ✅ DONE | 🔄 IN PROGRESS
```

---

### **MANDATORY Template for Every Finding**

Use this structure for EVERY finding (no exceptions):

```markdown
### Finding N: [Title]

**Location:** [file path], line ~[number]

**The Problem:**
[Show WRONG code in code block]

**Why This Matters (Learning):**
[Architectural principle + AGENTS.md reference + learning outcome]

**How to Fix It (Step-by-Step):**
[Numbered steps with exact locations, imports, and complete BEFORE/AFTER blocks]

**Verification:**
[How to test the fix]

**AGENTS.md Reference:**
[Link to relevant section]

**Impact:** [Change scope] | **Effort:** [Time] | **Priority:** [Level]
```

---

### **Example: Real Learning-Focused Finding**

```markdown
### Finding 1: EventEmitter → Subject (Semantic Correctness)

**Location:** `src/app/core/services/search.service.ts`, line ~30

**The Problem:**
```typescript
// ❌ WRONG: Using EventEmitter for internal stream steering
private readonly searchTerm$ = new EventEmitter<string>();
```

**Why This Matters (Learning):**
Per [AGENTS.md — Senior-Level RxJS Patterns](../../../AGENTS.md#senior-level-rxjs-service-pattern):
- `EventEmitter` is Angular's @Output decorator—meant for component communication
- `Subject` is RxJS's internal stream driver—meant for internal logic
- Using the right tool signals correct architectural thinking
- Reduces import complexity (one less Angular dependency in service logic)

**What You'll Learn:**
- Semantic correctness in reactive programming (tool fitness)
- Distinction between framework APIs and library APIs
- How to signal intent through proper type choices

**How to Fix It (Step-by-Step):**

**Step 1:** Open `src/app/core/services/search.service.ts`

**Step 2:** Find the import section (lines 1-15) and locate:
```typescript
import { Component, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventEmitter } from '@angular/core';  // ← Remove this line
// ... other imports
```

**Step 3:** Replace with:
```typescript
import { Component, HostListener, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';  // ← Add this instead
// ... other imports
```

**Step 4:** Find the field declaration (around line 30-35):
```typescript
export class SearchFieldComponent {
  // ... other fields
  private readonly searchTerm$ = new EventEmitter<string>();  // ← This line
```

**Step 5:** Replace:
```typescript
// BEFORE:
private readonly searchTerm$ = new EventEmitter<string>();

// AFTER:
private readonly searchTerm$ = new Subject<string>();
```

**Complete BEFORE:**
```typescript
import { EventEmitter } from '@angular/core';

export class SearchService {
  private readonly searchTerm$ = new EventEmitter<string>();
  
  readonly results$ = this.searchTerm$.pipe(
    debounceTime(500),
    switchMap(term => this.api.search(term))
  );
}
```

**Complete AFTER:**
```typescript
import { Subject } from 'rxjs';

export class SearchService {
  private readonly searchTerm$ = new Subject<string>();
  
  readonly results$ = this.searchTerm$.pipe(
    debounceTime(500),
    switchMap(term => this.api.search(term))
  );
}
```

**Verification:**
```bash
npm run build  # Should compile with no errors
npm run test   # Should pass
```

**AGENTS.md Reference:**
[Senior-Level RxJS Patterns](../../../AGENTS.md#senior-level-rxjs-service-pattern)

**After Fixing, Read:**
[AGENTS.md → When to Use RxJS](../../../AGENTS.md#when-to-use-rxjs-observables-reactive-programming)

**Questions to Think About:**
1. Why is Subject more correct for internal streams than EventEmitter?
2. What's the semantic difference between "component output" and "internal stream steering"?
3. How does import count relate to code clarity?

**Impact:** Minor refactoring | **Effort:** 5 minutes | **Priority:** 🔴 High | **Status:** 📝 TODO
```

---

### Step 4: Highlight What's Good

- Point out patterns you'd like to see more of
- Recognize thoughtful decisions (error handling, encapsulation, etc.)
- Reinforce learning patterns for educational projects

### Step 4: Highlight What's Good

- Point out patterns you'd like to see more of
- Recognize thoughtful decisions (error handling, encapsulation, etc.)
- Reinforce learning patterns for educational projects

### Step 5: Summarize

End with:
- **Severity Level**: Critical (blocks merge) | High (should fix) | Medium (nice to have) | Low (future refactor)
- **Recommended Priority**: Top concern first
- **Learning Wins**: If applicable, what you're learning from this code
- **Next Steps**: What to review or refactor next

### Step 6: Save Findings to Review File

All findings must be persisted to the project for future reference:

1. **Create or update `review_findings.md`** in the reviewed component/module directory
   - List all findings with severity levels
   - Include code examples and suggested fixes
   - Reference AGENTS.md rules for each finding
   - Provide actionable next steps

2. **Format**: Use consistent structure:
   ```markdown
   # Code Review Findings: [Component/Service Name]

   **Reviewed:** [Date] | **Reviewer:** AI Code Review Skill
   **Technology:** [Stack] | **Layer:** [core/, features/*/components/, etc.]

   ## High Priority Findings

   ### Finding 1: [Title]
   - What: [Description]
   - Why: [Impact + AGENTS.md reference]
   - How: [Suggested fix]
   - Impact: [Change scope]

   ## Medium Priority Findings
   [same structure]

   ## Learning Wins
   [Positive patterns observed]
   ```

3. **Integration with Review.md** (if it exists):
   - `review_findings.md` = Current review output (findings only)
   - `Review.md` = Cumulative implementation roadmap (historical findings + new ones)
   - Mark items in Review.md as `✅ DONE`, `📝 TODO`, or `🔄 IN PROGRESS`

## Conversation Shorthand

Once initialized, use short prompts — context auto-loads from AGENTS.md:

```
@codeReviewSenior [paste code]
```

With specific focus areas:

```
@codeReviewSenior [code] -- focus: testability
@codeReviewSenior [code] -- focus: memory leaks, error handling
@codeReviewSenior [code] -- learning goal: signals + effect patterns
```

## Example Prompts to Try

### Example 1: Service Review (RxJS)

```
@codeReviewSenior

// src/app/core/services/node-search.service.ts
export class NodeSearchService {
  private searchTerm$ = new Subject<string>();
  
  readonly results$ = this.searchTerm$.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.api.search(term)),
  );
  
  search(term: string) {
    this.searchTerm$.next(term);
  }
}

-- focus: error handling, testability
```

**Auto-detected context:**
- Layer: `core/services/`
- Technology: Angular 20
- Pattern expected: RxJS (per AGENTS.md)
- Rules applied: RxJS service patterns, error handling

---

### Example 2: Component Review (Signals)

```
@codeReviewSenior

// src/app/features/node/components/item-selector/item-selector.component.ts
export class ItemSelectorComponent {
  items = signal<Item[]>([]);
  selectedId = signal<string | null>(null);
  filtered = computed(() => 
    this.items().filter(i => i.id !== this.selectedId())
  );
}

-- learning goal: signals and computed()
```

**Auto-detected context:**
- Layer: `features/node/components/`
- Technology: Angular 20, TypeScript
- Pattern expected: Signals only (per AGENTS.md)
- Learning focus: signals and computed() patterns

---

### Example 3: Simple Code Paste (Context Auto-Loads)

```
@codeReviewSenior

export class MyPageComponent {
  private readonly service = inject(MyService);
  data$ = this.service.fetchData().pipe(
    shareReplay(1)
  );
}
```

**Auto-detected from file context + AGENTS.md:**
- If in `features/*/pages/` → Check page/container patterns
- If in `core/` → Check core service patterns
- Loads all matching rules automatically

## Limitations

- **Missing rules in AGENTS.md** → Review stops; user must document rules first
- **Cross-technology reviews** → Only for technologies/patterns documented in AGENTS.md
- **Security reviews** → Limited to documented security guidelines
- **Performance tuning** → Requires documented performance standards in AGENTS.md
- **Cannot invent patterns** → Only reviews against *documented* best practices, never against assumed standards

## Re-Review Workflow (Verifying Fixed Findings)

After you've implemented a fix, you can ask the skill to verify it. This workflow confirms that your fix matches the best practices documented in AGENTS.md.

### ⚠️ CRITICAL: Automatic review_findings.md Updates

When the skill verifies a finding (via `-- verify Finding N` or `-- re-review complete`), it MUST automatically update the review_findings.md file in the component's directory. This is not optional—it's part of the verification workflow.

**The skill automatically updates:**
1. Finding status: `📝 TODO` → `✅ VERIFIED` (or `⚠️ NEEDS REVISION` if issues found)
2. Verification details: date, summary of changes, verification checklist
3. Summary table: update status column for the verified finding
4. Progress indicator: increment count (e.g., `1/5` → `2/5`)
5. Implementation order: mark completed, update "next step"
6. Any new issues found: add as new findings with `📝 NEW FINDING` marker

**Do not ask users to manually update review_findings.md.** The verification process handles it automatically.

---

### Option 1: Re-Review a Specific Finding

After fixing a finding, paste the fixed code and reference the finding number:

```
@codeReviewSenior -- verify Finding 1

[Paste your fixed code here]

File: src/app/core/layout/components/layout-header/components/search-field/search-field.ts
Finding: EventEmitter → Subject (Semantic Correctness)
```

The skill will:
1. Check that the fix matches the expected pattern from AGENTS.md
2. Verify imports are correct
3. Confirm no new issues were introduced
4. Either mark as ✅ VERIFIED or suggest adjustments

**CRITICAL: Automatic update of review_findings.md**

When verifying a finding with `-- verify Finding N`, the skill MUST automatically update the review_findings.md file:

1. **Find the finding section** in review_findings.md by title/number
2. **Update the status** from `📝 TODO` to `✅ VERIFIED`
3. **Add verification details:**
   - `**Verification Date:**` [Today's date]
   - `**Verified By:**` AI Code Review Skill
   - `**Changes:**` [Summary of what was changed]
4. **Add verification checklist** showing which checks passed
5. **Update the summary table** at the top of the file - change status column for this finding
6. **Update progress indicator** - increment the count (e.g., `✅ 1/5 HIGH PRIORITY findings verified`)
7. **Update implementation order** - mark completed findings as ✅ DONE, update next step

**Example auto-update output:**

When you request `@codeReviewSenior -- verify Finding 1`, the skill will:
- Check the code
- Generate verification report with checklist
- Automatically edit review_findings.md to update:
  ```markdown
  **Status:** ✅ VERIFIED
  **Verification Date:** 2026-09-01
  **Verified By:** AI Code Review Skill
  **Changes:** Replaced searchTerm$ initialization from EventEmitter to Subject; import updated
  
  **Verification Summary:**
  | Check | Result |
  |-------|--------|
  | Subject imported from 'rxjs' | ✅ Yes |
  | searchTerm$ uses Subject | ✅ Yes |
  | No semantic issues | ✅ Correct pattern |
  ```
- Update summary table: `| 1 | Finding Name | High | 5 min | Semantic correctness | ✅ VERIFIED |`
- Update progress: `**Progress:** ✅ 1/5 HIGH PRIORITY findings verified`

---

### Option 2: Re-Review the Entire Component

After fixing multiple findings, request a full re-review:

```
@codeReviewSenior -- re-review complete

File: src/app/core/layout/components/layout-header/components/search-field/search-field.ts

I've implemented Findings 1, 2, and 3 from review_findings.md.
Please verify all fixes are correct and check for any new issues.
```

The skill will:
1. Review the entire file against AGENTS.md rules
2. Verify all documented fixes are in place
3. Check for any regressions or new issues
4. **Automatically update review_findings.md:**
   - Mark each verified finding with `✅ VERIFIED` + verification details
   - Update progress indicator to reflect total verified
   - Update summary table with new statuses
   - Check for any new findings and add them with `📝 NEW FINDING` marker
   - Provide a comprehensive verification report

**Example auto-update for full re-review:**

When you request `@codeReviewSenior -- re-review complete` with Findings 1-3 fixed:

```markdown
**Progress:** ✅ 3/5 HIGH PRIORITY findings verified

| #   | Finding                | Priority  | Status        |
| --- | ---------------------- | --------- | ------------- |
| 1   | EventEmitter → Subject | 🔴 High   | ✅ VERIFIED   |
| 2   | Add retry logic        | 🔴 High   | ✅ VERIFIED   |
| 3   | Delete unused property | 🔴 High   | ✅ VERIFIED   |
| 4   | Memory safety docs     | 🟡 Medium | 📝 TODO       |
| 5   | Debounce timing        | 🟡 Medium | 🔄 EVALUATE   |
```

---

For quick verification without full re-review:

```
@codeReviewSenior -- check

[Paste just the section you fixed]

Does this follow the pattern from AGENTS.md?
- Subject instead of EventEmitter ✓
- Imports are correct ✓
- No side effects ✓
```

### Updating review_findings.md After Verification

Once a finding is verified ✅, update the status in review_findings.md:

**Before:**
```markdown
### Finding 1: EventEmitter → Subject (Semantic Correctness)

**Location:** `search-field.ts`, line ~30
**Status:** 📝 TODO
```

**After:**
```markdown
### Finding 1: EventEmitter → Subject (Semantic Correctness)

**Location:** `search-field.ts`, line ~30
**Status:** ✅ VERIFIED

**Verification Date:** 2026-09-01
**Verified By:** AI Code Review Skill
**Changes:** Replaced EventEmitter with Subject, updated imports
```

### Status Markers for review_findings.md

- 📝 **TODO**: Not started
- 🔄 **IN PROGRESS**: Currently working on this finding
- ✅ **VERIFIED**: Fixed and verified by code review
- ⚠️ **NEEDS REVISION**: Fix attempted but doesn't match pattern—try again

### Complete Re-Review Cycle

1. **Read** Finding 1 in review_findings.md
2. **Implement** the fix following step-by-step guide
3. **Test** locally: `npm run build && npm run test`
4. **Request verification**: Paste code with `@codeReviewSenior -- verify Finding 1`
5. **Review auto-updated file**: Check that review_findings.md was automatically updated with ✅ VERIFIED
6. **Repeat** for Findings 2, 3, etc.

**Note:** Steps 1-4 are your responsibility. Step 5 is **automatic**—the skill updates review_findings.md for you.

### Example: Full Re-Review Request

```
@codeReviewSenior -- re-review complete

I've implemented the following fixes from review_findings.md:
- ✅ Finding 1: EventEmitter → Subject
- ✅ Finding 2: Add retry logic  
- ✅ Finding 3: Delete unused property
- ✅ Finding 4: Memory safety documentation

File: src/app/core/layout/components/layout-header/components/search-field/search-field.ts

Please verify all fixes are correct and check if there are any remaining issues 
or new findings that weren't in the original review.

Current test status: npm run build ✓ | npm run test ✓
```

The skill will then:
1. Analyze the updated code
2. Verify each fix
3. Check for any new issues
4. Provide a summary update for review_findings.md

---

## Skill Maintenance

When you add new technologies or patterns to this project:

1. Update AGENTS.md with the new rules/patterns
2. Add code examples to AGENTS.md (the skill will reference them)
3. Optionally, mention in commit: "Added [Technology] best practices to AGENTS.md"

The skill auto-discovers these additions next review.

## Related Skills to Create Next

- **Refactor Review**: Assessing refactoring proposals against architectural rules
- **Test Coverage Review**: Evaluating test sufficiency per AGENTS.md standards
- **Performance Audit**: Deep-dive on documented performance concerns
- **Architecture Decision Record**: Documenting why a pattern was chosen
