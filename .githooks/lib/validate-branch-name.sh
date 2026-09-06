#!/usr/bin/env sh

CONVENTIONAL_BRANCH_PATTERN='^(feature|feat|fix|bugfix|hotfix|release|chore|docs|style|refactor|perf|dependabot|ai|claude|codex|copilot|cursor)/.+'

validate_branch_name() {
  ref_name=$1
  branch_name=${ref_name#refs/heads/}

  case "$branch_name" in
    main|master|develop|staging|production)
      return 0
      ;;
  esac

  if printf '%s\n' "$branch_name" | grep -Eq "$CONVENTIONAL_BRANCH_PATTERN"; then
    return 0
  fi

  printf '%s\n' "Invalid branch name: $branch_name" >&2
  printf '%s\n' 'Use type/description. Allowed types: feature, feat, fix, bugfix, hotfix, release, chore, docs, style, refactor, perf, dependabot, ai, claude, codex, copilot, cursor' >&2
  return 1
}
