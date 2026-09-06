## Semantic HTML

Semantic HTML uses elements for what content means, not just for how it looks. This matters because browsers, search engines, keyboard users, screen-reader users, and other developers all depend on the structure of the document.

### Meaning before styling

Use an element because it matches the role of the content. A `button` is for an action. A link is for navigation. A `nav` contains major navigation links. An `article` can stand alone as a complete piece of content.

```html
<main>
  <article>
    <h1>Course update</h1>
    <p>The project deadline moved to Friday.</p>
    <button type="button">Acknowledge</button>
  </article>
</main>
```

This structure communicates a main content area, a self-contained article, a primary heading, text, and an action. CSS can make a `div` look like a button, but it does not automatically provide the same keyboard behavior or accessibility semantics.

### Headings and landmarks

Headings create a map of the page. A user should be able to skim headings and understand the organization. Landmark elements such as `header`, `nav`, `main`, `aside`, and `footer` let assistive technology jump between major regions.

- Use one clear page-level `h1`.
- Nest headings by meaning, not by visual size.
- Do not skip from `h2` to `h4` just because it looks better.
- Use CSS classes to control size when the semantic level is correct.

### When generic elements are fine

`div` and `span` are useful when no specific element fits. A layout wrapper, icon container, or inline styling hook may not need a stronger semantic element. The mistake is using generic elements for controls, headings, lists, or navigation when HTML already has a better tool.

### Common repairs

1. Replace clickable `div` elements with `button` or `a`.
2. Convert repeated rows of content into a `ul` or `ol`.
3. Add a `main` landmark around the primary page content.
4. Check heading order after visual design changes.

> Good semantics reduce the amount of custom behavior you have to rebuild.

### Guided practice

Take a simple page made mostly of `div` elements. Rewrite it with `header`, `nav`, `main`, `section`, `article`, `button`, and `footer` where appropriate. Then use the browser accessibility tree or a heading-outline tool to confirm the structure is understandable without CSS.

### Key takeaway

Semantic HTML gives content reliable meaning. Choose the correct element first, then style it.
