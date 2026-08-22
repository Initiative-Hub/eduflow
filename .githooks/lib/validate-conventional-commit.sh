#!/usr/bin/env sh

# Shared by commit-msg, pre-push, and pre-receive. Keep this dependency-free so
# it can run on developer machines and bare Git repositories alike.

CONVENTIONAL_COMMIT_PATTERN='^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([[:alnum:]_.\/-]+\))?!?: [^[:space:]].*$'

validate_conventional_subject() {
  subject=$1

  if printf '%s\n' "$subject" | grep -Eq "$CONVENTIONAL_COMMIT_PATTERN"; then
    return 0
  fi

  printf '%s\n' "Invalid commit message: $subject" >&2
  printf '%s\n' 'Use Conventional Commits, for example: fix(something): fix the issue' >&2
  printf '%s\n' 'Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.' >&2
  return 1
}

validate_conventional_commit() {
  commit=$1

  # Merge commits receive Git-generated subjects and do not represent a single
  # change type, so they are intentionally excluded from this check.
  parent_count=$(git rev-list --parents -n 1 "$commit" | awk '{ print NF - 1 }')
  if [ "$parent_count" -gt 1 ]; then
    return 0
  fi

  validate_conventional_subject "$(git log -1 --format=%s "$commit")"
}
