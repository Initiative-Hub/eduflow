# Repository Git hooks

These hooks enforce conventional branch names and Conventional Commit subjects on local pushes. The protected branches `main`, `staging`, and `production` are exempt from the branch-name rule.
Enable the client-side hooks once per clone:

```sh
git config core.hooksPath .githooks
```

The `pre-receive` hook must be installed on the Git server because server-side
hooks are not distributed to clones. Copy the complete `.githooks` directory to
the bare repository's hooks directory so it can source `lib/validate-conventional-commit.sh`.

**Branch Name Format**

```text
type/description
```

For example, `feat/draft-uploads`.

**Conventional Commit Format**

```text
type(optional-scope)!: description
```

For example, `fix(something): fix the issue`.
