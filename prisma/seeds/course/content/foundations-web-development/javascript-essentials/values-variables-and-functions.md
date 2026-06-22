## Values, Variables, and Functions

JavaScript programs transform values. Variables give values names, and functions package repeatable work. Clear code makes the value, transformation, and result easy to follow.

### Know the value you have

Primitive values include strings, numbers, booleans, `null`, and `undefined`. Objects and arrays can contain other values and can be changed by reference. Bugs often appear when code assumes the wrong shape.

```ts
const title = 'Introduction';
const completed = false;
const scores = [80, 95, 72];
const learner = { name: 'Mai', level: 'beginner' };
```

Use explicit checks at boundaries. Data from forms, APIs, and storage should not be trusted until the code confirms what it received.

### Names communicate decisions

Use `const` by default. Use `let` when a value is intentionally reassigned. Avoid names that describe the type but not the meaning, such as `arr` or `obj`. A name like `completedLessonIds` explains why the array exists.

- `totalPrice` is clearer than `num`.
- `isSubmitting` is clearer than `flag`.
- `formatCurrency` is clearer than `doFormat`.

### Functions as small transformations

A function should accept clear inputs and return a useful output. Separate calculation from display or network activity when possible.

```ts
function calculateTotal(prices: number[], taxRate: number) {
  const subtotal = prices.reduce((sum, price) => sum + price, 0);
  const tax = subtotal * taxRate;

  return {
    subtotal,
    tax,
    total: subtotal + tax,
  };
}
```

This function can be tested without a browser because it only depends on its arguments.

### Review checklist

- [ ] Inputs and outputs are visible.
- [ ] Names describe meaning, not just type.
- [ ] Calculation is separated from side effects.
- [ ] Empty and unusual values are considered.

### Guided practice

Write a function that accepts item prices, a discount percentage, and a tax rate. Return subtotal, discount, tax, and final total. Try an empty list, decimal prices, and a zero discount before connecting the function to the page.

### Key takeaway

Reliable JavaScript starts with clear values, honest names, and focused functions.
