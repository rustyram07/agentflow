# ...existing code...
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="/Users/r/Documents/aitax"
BRANCH="fix/codebase-issues-local"
BACKEND_DIR="${REPO_ROOT}/agentflow-studio/backend"
FRONTEND_DIR="${REPO_ROOT}/agentflow-studio/frontend"

echo "1) Switch to repo root"
cd "$REPO_ROOT"

echo "2) Create local branch (no push)"
git fetch origin || true
git checkout -B "$BRANCH"

# Prefer project-level package managers if present
if [ -d "$BACKEND_DIR" ]; then
  echo "3) Install backend deps"
  cd "$BACKEND_DIR"
  npm ci || npm install || true
fi

if [ -d "$FRONTEND_DIR" ]; then
  echo "4) Install frontend deps"
  cd "$FRONTEND_DIR"
  npm ci || npm install || true
fi

echo "5) Run ESLint autofix (backend then frontend)"
# Backend
if [ -d "$BACKEND_DIR" ]; then
  cd "$BACKEND_DIR"
  if npm run -s lint -- --fix 2>/dev/null; then
    echo "Ran backend npm run lint -- --fix"
  else
    npx eslint . --ext .js,.ts,.tsx --fix || true
  fi
fi
# Frontend
if [ -d "$FRONTEND_DIR" ]; then
  cd "$FRONTEND_DIR"
  if npm run -s lint -- --fix 2>/dev/null; then
    echo "Ran frontend npm run lint -- --fix"
  else
    npx eslint . --ext .js,.ts,.tsx --fix || true
  fi
fi

echo "6) Run Prettier formatting across repo"
cd "$REPO_ROOT"
if command -v npx >/dev/null 2>&1; then
  npx prettier --write . || true
else
  echo "npx not available: skipping Prettier"
fi

echo "7) TypeScript check (no emit)"
cd "$REPO_ROOT"
if [ -f "${BACKEND_DIR}/tsconfig.json" ]; then
  npx tsc --noEmit -p "${BACKEND_DIR}/tsconfig.json" || true
fi
if [ -f "${FRONTEND_DIR}/tsconfig.json" ]; then
  npx tsc --noEmit -p "${FRONTEND_DIR}/tsconfig.json" || true
fi

echo "8) Run tests (non-interactive, best-effort)"
if [ -d "$BACKEND_DIR" ]; then
  cd "$BACKEND_DIR"
  npm test -- --watchAll=false || true
fi
if [ -d "$FRONTEND_DIR" ]; then
  cd "$FRONTEND_DIR"
  npm test -- --watchAll=false || true
fi

echo "9) Show git status and staged diff"
cd "$REPO_ROOT"
git status --porcelain

if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "chore: auto-fix linting, formatting, and type issues (local only)" || true
  echo "Committed changes locally on branch: $BRANCH"
else
  echo "No changes to commit."
fi

echo ""
echo "Local fix workflow complete. Review changes with:"
echo "  git --no-pager log --oneline -n 5"
echo "  git status"
echo "  git diff HEAD~1..HEAD"
echo ""
echo "Open the repo in VS Code to inspect:"
echo "  code -r \"$REPO_ROOT\""
# ...existing code...
