# Chapter 29: Keep code quality with 16 TypeScript rules

[Contents](README.md) · [Previous](34-chapter.md) · [Next](36-chapter.md) · [简体中文](../zh-CN/35-chapter.md)

By kaito · [Japanese original](https://zenn.dev/sc30gsw/books/080faba713547b/viewer/4f9a46) · [Author’s English edition](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/00dce1)

Source snapshot: 2026-10-03. The text below preserves the author’s English edition.

[Authorization / 授权记录](../AUTHORIZATION.md)

<!-- book-body:start -->
This chapter covers [`/typescript-best-practices`](https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/SKILL.md).

`/typescript-best-practices` is a Skill the agent follows in TypeScript code. With it, the agent makes impossible states impossible to write in the type system. An example of an impossible state is a value that is loading and also has an error. The agent also validates data from outside once, at the place where the data enters.

This chapter and the next two, up to [Chapter 31](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/347946), cover the following three Skills that keep the quality of the code the agent writes, one per chapter.

1. `/typescript-best-practices` (this chapter)
2. [`/tdd`](https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md) ([Chapter 30](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/32928b))
3. [`/no-comments`](https://github.com/cursor/plugins/blob/main/pstack/skills/no-comments/SKILL.md) ([Chapter 31](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/347946))

In this book, I group the three as <strong>Skills that have something other than the author verify the code, instead of relying only on the attention of the agent that wrote it</strong>. In `/typescript-best-practices`, the compiler verifies in place of the author.

This chapter explains `/typescript-best-practices` from four angles: its role, when it is used, its rules, and how to write a request.

<a id="how-this-chapter-is-organized"></a>


## How this chapter is organized

This chapter has the following sections.

- Role: turn "Type System Discipline" into concrete TypeScript practice
- When it is used: it loads automatically when the agent reads or writes a TypeScript file
- Rules: 16 rules for writing TypeScript
- How to write a request: the agent follows the rules even if you do not name the Skill
- Summary

<a id="role%3A-turn-%22type-system-discipline%22-into-concrete-typescript-practice"></a>


## Role: turn "Type System Discipline" into concrete TypeScript practice

`/typescript-best-practices` is a set of TypeScript rules.

The principle "[<strong>Type System Discipline</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-type-system-discipline/SKILL.md)" in [Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4) explains why you make invalid states impossible to write in the type system. This Skill shows how to make invalid states impossible to write in TypeScript.

At the top of its `SKILL.md`, this Skill asks the agent to apply that principle first, before it uses the rules the Skill defines.

<a id="when-it-is-used%3A-it-loads-automatically-when-the-agent-reads-or-writes-a-typescript-file"></a>


## When it is used: it loads automatically when the agent reads or writes a TypeScript file

<strong>This Skill loads automatically when the agent reads or edits a TypeScript file</strong>. The `paths` setting in `SKILL.md` targets TypeScript files.

This Skill has the setting `disable-model-invocation: true` ([Chapter 25](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e5f103)), so the agent never picks it from the content of the conversation and runs it.

Because the Skill loads automatically, the agent cannot forget to call it. You do not need to call it by name either.

<a id="rules%3A-16-rules-for-writing-typescript"></a>


## Rules: 16 rules for writing TypeScript

This Skill consists of 16 rules and the code examples in [`references/patterns.md`](https://github.com/cursor/plugins/blob/main/pstack/skills/typescript-best-practices/references/patterns.md).

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="45"><strong><code>references/patterns.md</code>.</strong> A file that collects code examples for each rule defined in <code>SKILL.md</code></p>
<p class="code-line" data-line="47">It has code examples for 14 of the 16 rules, all except "Real tests" and "Structured telemetry"</p>
</div></aside>

The bundled guide [`docs/guide/05-build-and-clean.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md) describes this Skill as <strong>the type-system principle turned into concrete TypeScript rules</strong>.

The 16 rules, in order, are as follows.

<table class="code-line" data-line="54">
<thead class="code-line" data-line="54">
<tr class="code-line" data-line="54">
<th>Rule</th>
<th>Summary</th>
</tr>
</thead>
<tbody class="code-line" data-line="56">
<tr class="code-line" data-line="56">
<td><a href="#1.-use-a-discriminated-union-to-make-impossible-states-impossible-to-write">Discriminated union</a></td>
<td>Decide in the type which fields each state can have, so that nobody can write contradictory values such as "loading and also has an error"</td>
</tr>
<tr class="code-line" data-line="57">
<td><a href="#2.-use-branded-types-to-prevent-mixing-up-values-that-mean-different-things">Branded types</a></td>
<td>Distinguish in the type between values that hold the same kind of string but mean different things, such as an ID and a plain string, to prevent mix-ups</td>
</tr>
<tr class="code-line" data-line="58">
<td><a href="#3.-build-types-so-that-invalid-values-cannot-be-put-together">Constructive modeling</a></td>
<td>Express a value with a condition, such as "a non-empty array", as a type that makes it impossible to build a value that breaks the condition</td>
</tr>
<tr class="code-line" data-line="59">
<td><a href="#4.-make-a-type-stricter-only-where-the-loose-type-forces-awkward-code">Simplest total type</a></td>
<td>Make a type stricter only where the current type forces awkward code</td>
</tr>
<tr class="code-line" data-line="60">
<td><a href="#5.-receive-data-from-outside-as-unknown"><code>unknown</code> over <code>any</code></a></td>
<td>Receive data from outside as a type that the code cannot use until it checks the contents</td>
</tr>
<tr class="code-line" data-line="61">
<td><a href="#6.-before-you-hand-write-a-type-guard%2C-use-the-repository's-schema-library">Schemas before guards</a></td>
<td>Before you hand-write code that checks data, use the validation library the project already uses</td>
</tr>
<tr class="code-line" data-line="62">
<td><a href="#7.-write-as-only-after-checking-the-value">No <code>as</code></a></td>
<td>Do not declare "this value is this type" without checking the contents</td>
</tr>
<tr class="code-line" data-line="63">
<td><a href="#8.-narrowing-has-an-order-of-preference">Narrowing hierarchy</a></td>
<td>Pick the way to check a value's type in order, starting from the safest</td>
</tr>
<tr class="code-line" data-line="64">
<td><a href="#9.-a-type-guard-checks-the-value-the-way-its-name-says">Type guards</a></td>
<td>A function that decides "is this that type" really checks what its name says</td>
</tr>
<tr class="code-line" data-line="65">
<td><a href="#10.-use-an-exhaustiveness-check-to-make-a-missing-case-a-compile-error">Exhaustiveness checks</a></td>
<td>When you add a kind of state, a compile error tells you that you forgot to handle it</td>
</tr>
<tr class="code-line" data-line="66">
<td><a href="#11.-use-satisfies-instead-of-as-to-check-that-a-value-matches-a-type"><code>satisfies</code> over <code>as</code></a></td>
<td>Check that a value matches a type without losing the value's detailed information</td>
</tr>
<tr class="code-line" data-line="67">
<td><a href="#12.-validate-once-where-data-enters%2C-and-trust-the-types-inside">Validation at the boundary</a></td>
<td>Check data from outside once at the entry point, and do not check it again inside</td>
</tr>
<tr class="code-line" data-line="68">
<td><a href="#13.-before-you-write-a-new-type%2C-derive-it-from-existing-types">Schema-derived types</a></td>
<td>Before you write a new type, take the parts you need from a type that already exists</td>
</tr>
<tr class="code-line" data-line="69">
<td><a href="#14.-pass-arguments-as-an-object%2C-not-by-position">Object args</a></td>
<td>Pass arguments by name to prevent mixing up their order</td>
</tr>
<tr class="code-line" data-line="70">
<td><a href="#15.-test-anything-you-can-run-locally-with-the-real-thing%2C-not-a-mock">Real tests</a></td>
<td>Test anything you can run locally with the real thing, not a fake</td>
</tr>
<tr class="code-line" data-line="71">
<td><a href="#16.-keep-diagnostic-information-in-structured-logs">Structured telemetry</a></td>
<td>Log information useful for investigation in a fixed shape, and do not leave <code>console.log</code> behind</td>
</tr>
</tbody>
</table>

The following sections go through each rule with the code examples from `references/patterns.md`. I have rewritten the comments in the examples.

<a id="1.-use-a-discriminated-union-to-make-impossible-states-impossible-to-write"></a>


### 1. Use a discriminated union to make impossible states impossible to write

A discriminated union is a type whose data takes a different shape for each kind. Each shape is a variant. A field that shows the kind, such as `kind`, tells the variants apart ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)).

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="80"><strong>Variant.</strong> Each of the shapes that one type can take<br/>
For example, in <code>DiffState</code> below, the three variants are <code>{ kind: "loading" }</code>, <code>{ kind: "ready"; diff: GitDiff }</code>, and <code>{ kind: "error"; error: string }</code></p>
</div></aside>

`references/patterns.md` uses a type built from a boolean and optional fields as the bad example.

In the bad example, you can write a value that has both `loading: true` and `error`, which means "loading and also has an error". In the good example, each `kind` decides which fields it can have, so you can write only the three valid states.

```
// A diff (the list of changed files)
type GitDiff = { files: string[] };

// Bad: a mix of a boolean and optional fields can also express contradictory states
type DiffStateLoose = { loading: boolean; diff?: GitDiff; error?: string };

// Good: only valid states can exist
type DiffState =
  | { kind: "loading" }
  | { kind: "ready"; diff: GitDiff }
  | { kind: "error"; error: string };
```

So if the fields depend on the state, write a discriminated union instead of a boolean and optional fields.

<a id="2.-use-branded-types-to-prevent-mixing-up-values-that-mean-different-things"></a>


### 2. Use branded types to prevent mixing up values that mean different things

A branded type is a basic value, such as a string, with a mark like `& { readonly __brand: "AgentId" }` attached ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)). It catches mix-ups at compile time, such as an unchecked string passed to a function that should receive an agent ID.

In the next example, `parseAgentId` at the data's entry point checks once that the string has the shape of a UUID, and then turns it into an `AgentId`. The code uses `as` in only one place, after the check.

```
type AgentId = string & { readonly __brand: "AgentId" };

// Checks whether a string has the shape of a UUID
declare function isUUID(input: string): boolean;

// Boundary: check the string, then turn it into an AgentId
function parseAgentId(input: string): AgentId {
  if (!isUUID(input)) throw new Error(`Invalid agent id: ${input}`);
  // The value has been checked, so as is allowed here
  return input as AgentId;
}

// Inside: accept only an AgentId and do not check the ID again
function focusAgent(id: AgentId): void {
  /* Treat the input as already checked */
}

// Compiles
focusAgent(parseAgentId("3f2b8c1e-9a4d-4e6b-8f1a-2c5d7e9b0a13"));
// An unchecked string, so this is a compile error
focusAgent("3f2b8c1e-9a4d-4e6b-8f1a-2c5d7e9b0a13");
```

Keep the mark in the shape `readonly __brand: "X"`, and do not invent a new way to write it.

So if values share the same underlying type but your code must handle them differently by meaning, make them branded types. Attach the type only after you check the value at the boundary.

<a id="3.-build-types-so-that-invalid-values-cannot-be-put-together"></a>


### 3. Build types so that invalid values cannot be put together

This rule, Constructive modeling, builds the type from valid parts only. It does not add runtime checks to a loose type to stop invalid values.

```
// A non-empty array: the first element always exists
type NonEmpty<T> = [T, ...T[]];

// Bad: accepts T[], so every caller repeats the empty check
function pickWinnerLoose(entries: string[]): string {
  if (entries.length === 0) throw new Error("no entries");
  return entries[Math.floor(Math.random() * entries.length)];
}

// Good: an empty value cannot exist in this type
function pickWinner(entries: NonEmpty<string>): string {
  return entries[Math.floor(Math.random() * entries.length)];
}

// Narrow a value received as T[] once with a type guard. After that, the type carries the fact
const isNonEmpty = <T>(arr: T[]): arr is NonEmpty<T> => arr.length > 0;
```

So before you reject invalid values at runtime, define a type in which invalid values cannot be put together.

<a id="4.-make-a-type-stricter-only-where-the-loose-type-forces-awkward-code"></a>


### 4. Make a type stricter only where the loose type forces awkward code

This rule, Simplest total type, does not ask you to make every type stricter. As long as every operation on an array can return a result for every input, including the empty array, keep `T[]`.

Make a type stricter only when the loose type forces awkward code where it is used. The signs of awkward code are the non-null assertion operator `!`, a type assertion such as `arr[0] as T`, and an error that "should never happen".

```
type NonEmpty<T> = [T, ...T[]];
type Session = { id: string; startedAt: Date };

// T[] is fine here: it can return 0 even for an empty array
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Bad: ! hides the empty-array case from the compiler
function newestSessionLoose(sessions: Session[]): Session {
  return sessions.at(0)!;
}

// Good: a stricter argument type removes the need for !
function newestSession(sessions: NonEmpty<Session>): Session {
  return sessions[0];
}
```

`references/patterns.md` also lists another correct option, which is to weaken the return type to `Session | undefined`.

So decide whether to make a type stricter by whether the loose type forces you to write things like the non-null assertion operator `!`.

<a id="5.-receive-data-from-outside-as-unknown"></a>


### 5. Receive data from outside as unknown

Code can use a value received as `any` without any check. Code cannot use a value received as `unknown` until it checks the value's type, so the agent cannot skip the validation.

```
// Bad: receiving any lets you use the value without checking it
function handleLoose(input: any) {
  // This compiles even if foo does not exist
  return input.foo.bar;
}

// Good: receive unknown, narrow the type, then use it
function handle(input: unknown) {
  if (typeof input === "object" && input !== null && "foo" in input) {
    // Here the compiler has verified that input has foo
  }
}
```

So if you do not know a value's shape until runtime, receive it as `unknown` and narrow the type before you use it.

<a id="6.-before-you-hand-write-a-type-guard%2C-use-the-repository's-schema-library"></a>


### 6. Before you hand-write a type guard, use the repository's schema library

For data from outside, the agent first looks for the runtime schema library the repository uses and for existing schemas, before it hand-writes a type guard that checks each field one by one. A type guard is a function that checks whether a value is a given type and returns a boolean.

Let one schema do the validation, and derive the TypeScript type from the schema. If you keep a schema, an interface of the same shape, and a type guard separately, you will forget to update one of the three, and the three will disagree.

```
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "member"]),
});

// Derive the type from the schema
type User = z.infer<typeof UserSchema>;

function parseUser(input: unknown): User {
  return UserSchema.parse(input);
}
```

So validate data from outside with the schemas the repository already uses, and derive the types from those schemas too.

<a id="7.-write-as-only-after-checking-the-value"></a>


### 7. Write as only after checking the value

`as`, a type assertion, tells the compiler "this value is this type" without checking the value. The code compiles even if the actual value's type differs, so the code that uses the value may stop with an error at runtime.

```
type User = { id: string; name: string };
declare const data: unknown;

// Bad: declares it a User without checking
const user = data as User;

// Good: check at the boundary, then use as
function parseUser(data: unknown): User {
  if (typeof data !== "object" || data === null) {
    throw new Error("expected object");
  }
  if (!("id" in data) || typeof data.id !== "string") {
    throw new Error("expected id");
  }
  // ...check every remaining field too
  // Every field has been checked, so as is allowed here
  return data as User;
}
```

When the agent removes `as` from existing code, it finds out why TypeScript cannot infer the type, and then applies one of the following fixes.

- If there is no field that shows the kind, add the field and make the type a discriminated union
- If the original type is too wide, such as `Record<string, unknown>`, narrow the type
- If the boundary has no type, add a parsing function or a schema
- If the type system cannot express the type, use a branded type or `satisfies`

So if you write `as`, check the value first.

<a id="8.-narrowing-has-an-order-of-preference"></a>


### 8. Narrowing has an order of preference

`references/patterns.md` prefers the ways to narrow a type in the following order.

1. A `switch` or `if` on the field that shows the kind (the compiler narrows automatically)
2. The `in` operator (`"key" in obj` narrows to the variant that has that field)
3. `typeof` and `instanceof`, for basic values and class instances
4. A custom type guard, when the three above are not enough
5. `as`, only after you check the value

The following code shows each of the five ways.

```
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

// 1. switch on the kind field: the compiler narrows automatically from kind
function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
  }
}

// 2. The in operator: only a circle has radius, so here it narrows to a circle
function areaByIn(s: Shape): number {
  if ("radius" in s) return Math.PI * s.radius ** 2;
  // Here it narrows to a rectangle
  return s.width * s.height;
}

// 3. typeof and instanceof: narrow to a basic value or a class instance
function describe(value: string | number | Date): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  // Here it narrows to number
  return value.toFixed(2);
}

// 4. A custom type guard: a function checks a condition the three above cannot (a non-empty string)
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

// 5. as: use only after the value is checked
type AgentId = string & { readonly __brand: "AgentId" };
declare function isUUID(input: string): boolean;

function toAgentId(input: string): AgentId {
  if (!isUUID(input)) throw new Error(`Invalid agent id: ${input}`);
  return input as AgentId;
}
```

So when you narrow a type, use the highest method on the list that works.

<a id="9.-a-type-guard-checks-the-value-the-way-its-name-says"></a>


### 9. A type guard checks the value the way its name says

A type guard must check the value the way its name says. A type guard that does not check hides a bug behind a name that claims safety. Such a type guard is worse than `as`. Name a type guard `isX` or `hasX`.

```
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

// Actually checks the field that shows the kind
function isCircle(s: Shape): s is Shape & { kind: "circle" } {
  return s.kind === "circle";
}
```

So if you write a type guard, the type guard must check what its name claims.

<a id="10.-use-an-exhaustiveness-check-to-make-a-missing-case-a-compile-error"></a>


### 10. Use an exhaustiveness check to make a missing case a compile error

Write `const _exhaustive: never = x;` in the `default` of a `switch`. Then, if you add a variant and forget to write the `case` that handles it, compilation fails ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)).

```
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.width * s.height;
    default: {
      // If you add a variant to Shape and forget its case, this line is a compile error
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}
```

In a `switch` that returns no value, write `void _exhaustive;` instead of `return _exhaustive;`.

So if you branch on each variant, check exhaustiveness in `default`.

<a id="11.-use-satisfies-instead-of-as-to-check-that-a-value-matches-a-type"></a>


### 11. Use satisfies instead of as to check that a value matches a type

`satisfies` checks that a value matches a type without widening literal types. A literal type stands for one specific value, such as `"dark"`.

```
type Config = { theme: "dark" | "light"; cols: number };

// Bad: with as, the type of theme widens to "dark" | "light" and the fact that it is "dark" is lost
const configLoose = { theme: "dark", cols: 3 } as Config;

// Good: satisfies checks that the value matches the type and keeps the literal type
const config = { theme: "dark", cols: 3 } satisfies Config;
// The type of config.theme is "dark", not string
```

So if you only want to check that a value matches a type, use `satisfies`, not `as`.

<a id="12.-validate-once-where-data-enters%2C-and-trust-the-types-inside"></a>


### 12. Validate once where data enters, and trust the types inside

Where data enters, parse it into a domain type, and inside, use the typed value without checking it again. This rule follows the principle "[<strong>Boundary Discipline</strong>](https://github.com/cursor/plugins/blob/main/pstack/skills/principle-boundary-discipline/SKILL.md)" ([Chapter 18](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/e529e4)).

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<p class="code-line" data-line="396"><strong>Domain type.</strong> A type that represents a business concept the app handles, such as a user ID or an order<br/>
For example, the following code holds order data received from outside in two different types</p>
</div></aside>

```
// A domain type: the fields of an order and the type of each are fixed
type Order = { id: string; userId: string; total: number };

// Not a domain type: you do not know which fields exist, so you must check every time you use it
type RawOrder = Record<string, unknown>;
```

With validation at the boundary, the code where data enters checks a value like `RawOrder` once and turns it into an `Order`. The code inside handles only `Order`.

So validate data from outside once at the entry point, and trust the types inside.

<a id="13.-before-you-write-a-new-type%2C-derive-it-from-existing-types"></a>


### 13. Before you write a new type, derive it from existing types

If an OpenAPI definition, a GraphQL schema, or a database migration already defines the shape of the data, the agent does not rewrite a type of the same shape. It derives the type from the types generated from that source.

```
// A generated type (normally imported from the generated module)
type ChecksMessage = {
  totalCount: number;
  checks: { name: string; status: string }[];
  updatedAt: string;
};

// Bad: rewrites the same shape, so it drifts when the schema changes
type CheckSummary = {
  totalCount: number;
  checks: { name: string; status: string }[];
};
function renderChecksLoose(s: CheckSummary) {
  /* ... */
}

// Good: take only the needed fields from the generated type
function renderChecks(s: Pick<ChecksMessage, "totalCount" | "checks">) {
  /* ... */
}
```

Before you write a new interface, check whether you can use `Pick`, `Omit`, `Parameters`, `ReturnType`, `Awaited`, or `typeof`.

So if a source definition exists, do not rewrite the type. Derive it from that definition.

<a id="14.-pass-arguments-as-an-object%2C-not-by-position"></a>


### 14. Pass arguments as an object, not by position

When you pass arguments as an object, the names show which value is which argument, and you can no longer mix up their order.

```
type Selection = {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
};
declare const uri: string;
declare function openFileLoose(uri: string, selection: Selection): void;
declare function openFile(args: { uri: string; selection: Selection }): void;

// Bad: if two arguments are swapped, it still compiles as long as the types match
openFileLoose(uri, {
  startLineNumber: 10,
  startColumn: 1,
  endLineNumber: 10,
  endColumn: 1,
});

// Good: order does not matter, and the names show what each value is
openFile({
  uri,
  selection: {
    startLineNumber: 10,
    startColumn: 1,
    endLineNumber: 10,
    endColumn: 1,
  },
});
```

However, this rule does not apply to code that runs over and over, such as per-frame rendering, tokenizers, and parsers. Each call creates an argument object and allocates memory. In code that repeats many times, those allocations slow the code down.

<aside class="msg message"><span class="msg-symbol">!</span><div class="msg-content">
<ul class="code-line" data-line="481">
<li class="code-line" data-line="481">
<strong>Per-frame rendering.</strong> Code that redraws the screen dozens of times a second, as in animations and games</li>
</ul>
</div></aside>

So if there are several arguments, pass them as an object, except in code that runs over and over.

<a id="15.-test-anything-you-can-run-locally-with-the-real-thing%2C-not-a-mock"></a>


### 15. Test anything you can run locally with the real thing, not a mock

The agent does not mock anything it can run locally. It runs the real thing in the test. It mocks only what it cannot run locally, such as an external payment service. To verify screens, it builds the app and runs it.

```
declare function test(name: string, fn: () => Promise<void>): void;
declare function expect<T>(actual: T): { toBe(expected: T): void };
declare function makeTempDir(): Promise<string>;
declare function saveNote(dir: string, text: string): Promise<void>;
declare function loadNote(dir: string): Promise<string>;
declare const fakeFs: { writeFile: { calledTimes: number } };

// Bad: replaces even file saving, which can run locally, with a fake, and checks only how many times the fake was called
test("saves a note", async () => {
  await saveNote("/notes", "groceries");
  expect(fakeFs.writeFile.calledTimes).toBe(1);
});

// Good: writes a real file to a temporary directory, reads it back, and checks its contents
test("reads back a saved note", async () => {
  const dir = await makeTempDir();
  await saveNote(dir, "groceries");
  expect(await loadNote(dir)).toBe("groceries");
});
```

<a id="16.-keep-diagnostic-information-in-structured-logs"></a>


### 16. Keep diagnostic information in structured logs

The agent keeps diagnostic information in structured logs, which are logs with fixed fields. The logs hold enough information to trace a bug from an ID. It does not leave `console.log` in code it ships.

```
declare const logger: {
  error(event: string, fields: Record<string, unknown>): void;
};
declare const orderId: string;
declare const userId: string;
declare const err: Error;

// Bad: a plain string does not let you find out later which order failed or why
console.log("payment failed");

// Good: record the event name, plus the IDs and reason you need for investigation, in fixed fields
logger.error("payment_failed", { orderId, userId, reason: err.message });
```

With the log in the good example, a person or an agent who investigates a bug can search by `orderId` and trace what happened to that order.

So keep diagnostic information in logs that you can trace by ID later.

<a id="how-to-write-a-request%3A-the-agent-follows-the-rules-even-if-you-do-not-name-the-skill"></a>


## How to write a request: the agent follows the rules even if you do not name the Skill

This Skill has no example requests.

The bundled guide [`docs/guide/05-build-and-clean.md`](https://github.com/cursor/plugins/blob/main/pstack/docs/guide/05-build-and-clean.md) also says that the user does not call this Skill as a slash command during work.

<a id="summary"></a>


## Summary

- <strong>Who verifies.</strong> The compiler finds type errors in place of the agent that wrote the code.
- <strong>When it is used.</strong> It loads automatically when the agent reads or writes a TypeScript file.
- <strong>Rules.</strong> The agent makes impossible states impossible to write in the type system, and validates data from outside once, where the data enters.

The next chapter, [Chapter 30](https://zenn.dev/sc30gsw/books/7ff701b9811d04/viewer/32928b), covers [`/tdd`](https://github.com/cursor/plugins/blob/main/pstack/skills/tdd/SKILL.md), the second of the three Skills that keep code quality. Before the agent fixes a bug, `/tdd` has the agent write a test that fails before the fix.
<!-- book-body:end -->

---

[Contents](README.md) · [Previous](34-chapter.md) · [Next](36-chapter.md) · [简体中文](../zh-CN/35-chapter.md)
