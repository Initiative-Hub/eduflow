# Repository Git hooks

These hooks enforce Conventional Commit subjects on local commits and pushes.
Enable the client-side hooks once per clone:

```sh
git config core.hooksPath .githooks
```

The `pre-receive` hook must be installed on the Git server because server-side
hooks are not distributed to clones. Copy the complete `.githooks` directory to
the bare repository's hooks directory so it can source `lib/validate-conventional-commit.sh`.

Accepted format:

```text
type(optional-scope)!: description
```

For example, `fix(something): fix the issue`.
