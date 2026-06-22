## Git and Collaborative Workflows

Version control records how a project changes. Collaboration workflows use that history to propose, review, test, and integrate work without losing context.

### Commits tell a story

A commit should contain one coherent change. The message should explain the purpose, not only the files touched. Small commits make review, rollback, and debugging easier.

```text
Improve signup form validation

Keep entered values after an error and show field-level messages.
```

This is more useful than `fix stuff` because it names the behavior and the reason.

### Branches isolate work

A branch gives a feature or fix its own line of development. You can commit experimental work without immediately changing the shared branch. A pull request then creates a review space for code, tests, screenshots, and discussion.

- Start from an updated main branch.
- Name the branch after the task.
- Keep the pull request focused.
- Explain user-visible behavior in the description.

### Conflicts need judgement

A merge conflict means Git cannot safely choose between overlapping edits. The correct answer is not always one side or the other. Read both versions, understand the intended final behavior, and combine them deliberately.

```text
<<<<<<< HEAD
Submit assignment
=======
Turn in project
>>>>>>> feature/copy-update
```

In this example, the right final copy depends on the product decision, not on which branch is newer.

### Review habits

Good review comments focus on behavior, maintainability, security, accessibility, and correctness. Good responses explain the change made or the reason for choosing a different approach.

### Guided practice

Create a branch, make two focused commits, and compare it with the base branch. Then create a controlled text conflict in a practice repository and resolve it while preserving the intent of both edits.

### Key takeaway

Git is most valuable when history is clear, branches stay focused, and conflicts are resolved through understanding.
