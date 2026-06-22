## Building and Reviewing

Capstone implementation combines structure, presentation, interaction, and quality checks. Building in layers keeps the project understandable while it grows.

### Build from meaning outward

Start with semantic HTML and readable source order. Add CSS for layout and hierarchy. Add JavaScript only where interaction requires it. Each layer should leave the essential content usable.

```html
<section aria-labelledby="featured-work">
  <h2 id="featured-work">Featured work</h2>
  <article>
    <h3>Course dashboard redesign</h3>
    <p>Improved navigation and reduced setup steps.</p>
    <a href="/work/dashboard">Read case study</a>
  </article>
</section>
```

This structure can be reviewed before visual styling begins.

### Review the task, not the screenshot

A screenshot may look polished while the task still fails. Ask whether a user can find information, understand controls, complete the primary action, and recover from mistakes.

- Can a first-time visitor explain what the site offers?
- Is the main action available without scrolling too far?
- Does keyboard focus remain visible?
- Does the layout survive long text?
- Are empty and error states handled?

### Use feedback as evidence

When someone reviews the site, record the observed problem before deciding the fix. "The tester did not notice the contact button" is stronger than "make the button prettier." It points to hierarchy, copy, placement, or contrast.

### Revision workflow

1. Observe a real task.
2. Write the problem and its impact.
3. Group related issues.
4. Choose one focused revision.
5. Re-test the same task.

> Feedback is useful when it changes a decision, not when it becomes an endless preference list.

### Guided practice

Implement the primary page of your capstone. Ask another person to complete its main task without guidance. Watch silently, record hesitation points, and revise the highest-impact issue first.

### Key takeaway

Build complete slices, review real tasks, and let evidence guide revision.
