## Forms and Accessible Inputs

Forms are where users give information, make choices, and trigger work. A good form is clear before submission, forgiving after mistakes, and usable with a keyboard or assistive technology.

### Labels, hints, and names

Every input needs a persistent label. Placeholders can show examples, but they disappear while typing and are not a replacement for labels. Connect labels with `for` and `id`, or wrap the input inside the label.

```html
<label for="email">Email address</label>
<input
  id="email"
  name="email"
  type="email"
  autocomplete="email"
  aria-describedby="email-hint"
/>
<p id="email-hint">Use the address you check most often.</p>
```

The `name` attribute matters because it identifies submitted values. The `type` attribute helps the browser show the right keyboard, validation affordances, and autofill behavior.

### Validation that helps recovery

Validation should explain what happened and how to fix it. Keep the user's entered values when possible. Place field-specific messages close to the field. If several errors appear at once, provide a short summary near the top.

- Say "Enter an email address like name@example.com."
- Avoid vague messages such as "Invalid input."
- Do not rely on red color alone.
- Move focus carefully when showing a summary.

### Grouping and flow

Use `fieldset` and `legend` when several controls answer one question, such as a radio group. Keep tab order aligned with visual order. Put the submit button after the fields it submits.

```html
<fieldset>
  <legend>Preferred contact method</legend>
  <label><input type="radio" name="contact" value="email" /> Email</label>
  <label><input type="radio" name="contact" value="phone" /> Phone</label>
</fieldset>
```

### Form review checklist

- [ ] Each control has a visible label.
- [ ] Required fields are clearly marked.
- [ ] Hints and errors are associated with the correct input.
- [ ] The form works with keyboard only.
- [ ] Errors preserve user input and explain recovery.

### Guided practice

Build a registration form with name, email, password, and agreement fields. Submit it empty, then submit it with one invalid email address. Revise the labels, hints, and error messages until a user can understand the problem without guessing.

### Key takeaway

Accessible forms combine native controls, explicit labels, useful input types, clear grouping, and actionable validation.
