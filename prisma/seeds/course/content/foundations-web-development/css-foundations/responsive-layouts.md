## Responsive Layouts

Responsive design is not about targeting every device. It is about preserving content, hierarchy, and usability across changing space, input methods, zoom levels, and user preferences.

### Start with fluid defaults

Many responsive problems disappear when the layout is flexible from the beginning. Use relative units, wrapping, `max-width`, and modern layout systems before adding breakpoints.

```css
img {
  max-width: 100%;
  height: auto;
}

.article {
  width: min(100% - 2rem, 68ch);
  margin-inline: auto;
}
```

This keeps media inside its container and limits text line length without assuming a specific screen size.

### Content chooses breakpoints

A breakpoint should happen when the content no longer works. If a navigation row wraps awkwardly or a card grid becomes cramped, add a breakpoint for that problem. Avoid choosing breakpoints only because a popular phone or tablet has that width.

- Begin with the narrow layout.
- Let content wrap naturally.
- Add a breakpoint when reading or interaction becomes worse.
- Make the smallest change that restores clarity.

### Test beyond width

Viewport width is only one condition. Test zoom, translated text, keyboard focus, reduced motion, and touch targets. Long words, user font settings, and browser side panels can expose brittle assumptions.

> A layout that fits can still fail if controls are too small, focus is hidden, or text is clipped.

### Useful patterns

```css
.layout {
  display: grid;
  gap: 1.5rem;
}

@media (width >= 48rem) {
  .layout {
    grid-template-columns: 2fr 1fr;
  }
}
```

The base layout works as one column. The breakpoint adds columns only when there is enough room.

### Guided practice

Convert a fixed three-column feature section into a fluid layout. Test at narrow width, wide width, 200% zoom, and with one very long heading. Record the point where the content needs a new layout.

### Key takeaway

Responsive interfaces start fluid, use content-driven breakpoints, and test real constraints instead of device labels.
