# Sleep Engineer — development commands

# List available recipes
default:
  @just --list

# Install dependencies
install:
  npm install

# Start dev server
dev:
  npm run dev

# Run all tests
test:
  npx vitest run

# Run tests in watch mode
test-watch:
  npx vitest

# Lint (check formatting + lint rules, no writes)
lint:
  npx @biomejs/biome check src/

# Format and auto-fix lint issues
format:
  npx @biomejs/biome check --write src/

# Production build
build:
  npx vite build

# Preview production build
preview:
  npx vite preview

# Run all sanity checks: lint, test, build
check: lint test build

# Format, then run all sanity checks
fix: format lint test build
