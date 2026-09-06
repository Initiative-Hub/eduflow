## Accessibility and Performance

Accessible and fast interfaces help more people complete tasks with less friction. Both qualities improve when teams use the browser platform well, prioritize essential content, and measure real experience.

### Access is a system quality

Accessibility is not one checklist item. Keyboard access, visible focus, semantic names, sufficient contrast, zoom support, captions, and reduced-motion preferences work together.

- Can the task be completed with a keyboard?
- Does focus move in a predictable order?
- Do controls have meaningful names?
- Is text still readable at 200% zoom?
- Is information conveyed without relying only on color?

Automated tools catch useful patterns, but manual testing reveals whether the task is actually usable.

### Performance affects understanding

Slow pages delay learning and interaction. Large images, scripts, fonts, and third-party tools compete for bandwidth and processing time. Layout shifts can cause users to click the wrong target.

```html
<img
  src="/course-card.jpg"
  alt="Student reviewing a course outline"
  width="800"
  height="450"
/>
```

Width and height reserve space before the image loads, reducing layout shift.

### Prioritize by user impact

Not every audit warning deserves the same attention. A keyboard trap that blocks submission is more severe than a small score improvement with no task impact. Connect every improvement to the user journey.

### Review workflow

1. Test the primary task with keyboard only.
2. Check names and headings with accessibility tools.
3. Record a performance trace for the initial load and primary action.
4. Choose the highest-impact barrier.
5. Re-test the same path after the change.

> Accessibility and performance are product quality, not polish after the real work.

### Guided practice

Audit one page in this course project. Identify three barriers, choose the one with the highest task impact, and explain how you would measure improvement after fixing it.

### Key takeaway

Accessibility and performance should be measured against real user tasks, then improved by impact.
