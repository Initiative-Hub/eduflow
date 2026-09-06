## Debugging and Testing

Debugging is a search for the difference between expected and observed behavior. Testing preserves what you learn by turning important expectations into repeatable checks.

### Observe before changing

Start with reproduction. Record the exact steps, inputs, environment, and visible result. If a bug cannot be reproduced, every fix is guesswork.

- What did the user do?
- What should have happened?
- What actually happened?
- Which browser, data, account, or route was involved?
- Can the behavior be repeated?

### Form a small hypothesis

Use logs, breakpoints, network tools, and state inspection to test one idea at a time. Random edits can hide the original cause and introduce new behavior.

```ts
function formatDisplayName(user: { firstName?: string; lastName?: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}
```

If this displays `undefined Nguyen`, the hypothesis might be that `firstName` is missing. The next step is to inspect the boundary where `user` is created, not to patch the display in five places.

### Tests describe durable behavior

A useful test protects a behavior the project wants to keep. It should fail when the behavior breaks and stay stable during harmless refactoring.

- Test outputs and user-visible states.
- Avoid depending on private implementation details.
- Include one normal case and important boundary cases.
- Keep test names specific.

### Debugging checklist

- [ ] Reproduce the issue.
- [ ] Reduce the example.
- [ ] Inspect the boundary where the assumption first becomes false.
- [ ] Fix the cause.
- [ ] Add or update a focused test when the behavior should be preserved.

### Guided practice

Choose a small broken function. Write down the expected result, reproduce the wrong result, and identify the smallest input that shows the problem. Fix the cause and add one boundary case that would catch the regression.

### Key takeaway

Debug with evidence, fix causes instead of symptoms, and preserve important expectations with repeatable checks.
