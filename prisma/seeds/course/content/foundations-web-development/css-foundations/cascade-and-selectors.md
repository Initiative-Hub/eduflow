## The Cascade and Selectors

CSS lets many rules target the same element. The cascade decides which declaration wins. When you understand that process, you can debug styles without adding stronger and stronger selectors.

### How declarations compete

The browser compares declarations by origin, importance, specificity, and source order. In everyday author stylesheets, specificity and order are the most visible parts, but `!important` and inline styles can still override normal rules.

```css
.card p {
  color: gray;
}

.summary {
  color: black;
}
```

If a paragraph has class `summary` inside `.card`, the first rule may win because `.card p` has more specificity than `.summary`. Moving the second rule later only helps when specificity is equal.

### Selectors as contracts

A selector is a contract between HTML and CSS. Class selectors usually make stable styling hooks. Deep selectors such as `.page .sidebar ul li a span` are fragile because small markup changes break them.

- Prefer classes for reusable components.
- Keep selectors as short as the design allows.
- Avoid styling by IDs unless there is a strong reason.
- Use descendant selectors when the relationship matters.

### Inheritance and custom properties

Some properties inherit from parent to child, including `color` and `font-family`. Many layout properties do not. Custom properties can carry design tokens through the tree.

```css
.notice {
  --notice-color: hsl(210 70% 35%);
  color: var(--notice-color);
  border-color: var(--notice-color);
}
```

### Debugging overrides

Use the Styles panel to see which declaration is crossed out and why. Check the selector, source file, order, and whether inheritance is involved. Do not fix a cascade issue by adding `!important` until you understand the conflict.

> Specificity is easier to manage when selectors stay intentionally weak.

### Guided practice

Create three rules that all set the same button color. Predict the winner, confirm in developer tools, and then lower the specificity while keeping the same final design.

### Key takeaway

Predictable CSS comes from understanding the cascade, keeping selectors clear, and using specificity only when it expresses a real relationship.
