## The Box Model and Layout

Every visible element is drawn as a box. The box includes content, padding, border, and margin. Layout systems then arrange those boxes in relation to the page and to each other.

### Sizing the box

By default, `width` applies to the content box. Padding and border are added outside that width. With `box-sizing: border-box`, the declared width includes content, padding, and border, which makes component sizing easier to predict.

```css
* {
  box-sizing: border-box;
}

.card {
  width: 320px;
  padding: 24px;
  border: 1px solid currentColor;
}
```

In this version, the card's rendered width stays 320 pixels. Without `border-box`, it would become wider than expected.

### Normal flow, Flexbox, and Grid

Normal flow is good for documents. Blocks stack vertically, inline content flows across lines, and the document remains readable without much layout code. Flexbox is best for one-dimensional alignment: a row of buttons, a navigation bar, or a card header. Grid is best when rows and columns both matter.

- Use normal flow when content naturally reads top to bottom.
- Use Flexbox for distributing items along one main axis.
- Use Grid for two-dimensional page or card layouts.
- Avoid absolute positioning for ordinary page structure.

### Spacing systems

Spacing should express relationships. Padding creates internal breathing room. `gap` sets space between layout children. Margins separate an element from surrounding content, but they can collapse or create inconsistent edges if overused.

```css
.card-list {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}
```

### Layout review checklist

- [ ] The source order still makes sense without CSS.
- [ ] Components use consistent internal padding.
- [ ] Related items use `gap` instead of random margins.
- [ ] Fixed widths do not cause horizontal scrolling.

### Guided practice

Build a row of course cards. First write semantic HTML with no layout classes. Then add Grid with `gap`, internal card padding, and a flexible column definition. Resize the container and inspect how each box changes.

### Key takeaway

Understand the box first, then choose the simplest layout system that describes the relationship between boxes.
