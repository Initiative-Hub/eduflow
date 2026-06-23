## DOM and JavaScript Events

The Document Object Model gives JavaScript a structured view of the page. Events report user actions and browser changes so code can respond at the right moment.

### The page as a tree

HTML becomes a tree of nodes. JavaScript can select nodes, read attributes, change text, add classes, or create new elements. Prefer small targeted updates over rebuilding large sections for minor changes.

```ts
const statusMessage = document.querySelector('#status');

if (statusMessage) {
  statusMessage.textContent = 'Saved successfully.';
  statusMessage.classList.add('is-success');
}
```

Always consider whether the element may be missing. A selector that returns `null` should not crash the whole interaction.

### Events carry context

An event listener receives an event object. The object describes what happened and where it happened. Common events include `click`, `input`, `submit`, `keydown`, `focus`, and `blur`.

```ts
const form = document.querySelector('form');

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  // Validate, save, and show feedback.
});
```

Only prevent default behavior when you replace it with a complete alternative. A form that prevents submission but gives no feedback leaves the user stuck.

### Event delegation

When many child elements share similar behavior, attach one listener to a parent and inspect the event target. This is useful for dynamic lists.

```ts
const list = document.querySelector('#tasks');

list?.addEventListener('click', (event) => {
  const button = (event.target as Element).closest('button[data-task-id]');
  if (!button) return;
  button.closest('li')?.classList.toggle('is-complete');
});
```

### Interaction checklist

- [ ] The control has the correct HTML element.
- [ ] Keyboard interaction still works.
- [ ] Feedback is visible after the event.
- [ ] Errors are explained near the affected control.

### Guided practice

Build a small task list. Add items through a form, reject blank tasks visibly, and mark items complete through delegated click handling. Test with mouse and keyboard.

### Key takeaway

DOM events should create a clear loop: user action, application response, and perceivable feedback.
