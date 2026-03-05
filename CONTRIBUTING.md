# Contributing to ETCD Compass

Thanks for your interest in contributing! This document covers everything you need to get started.

## Prerequisites

See the [README](README.md#prerequisites) for installing Rust, Node.js, and system dependencies.

## Development Setup

```bash
git clone https://github.com/kazuma-desu/etcd-compass.git
cd etcd-compass
npm install
npm run tauri:dev
```

## Project Structure

```
etcd-compass/
├── src/                        # React frontend
│   ├── app/                    # App-level layout and providers
│   ├── commands/               # Tauri invoke wrappers
│   ├── components/             # Shared UI components (shadcn/ui)
│   ├── features/               # Feature modules (connections, keys, etc.)
│   │   ├── connections/        # Connection management
│   │   └── keys/               # Key browsing and CRUD
│   ├── shared/                 # Shared hooks, utilities
│   ├── lib/                    # General utilities
│   └── test/                   # Test setup and mocks
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Tauri commands and app setup
│   │   ├── etcd.rs             # ETCD client wrapper
│   │   └── config.rs           # Config persistence
│   └── Cargo.toml
├── biome.json                  # Linter and formatter config
├── tsconfig.app.json           # TypeScript config
└── vite.config.ts              # Vite + Tauri config
```

### Where to put things

- **New UI component** → `src/components/ui/` (shadcn-style primitives) or `src/components/` (composite)
- **New feature** → `src/features/<feature-name>/` with its own store, components, and tests
- **Shared hook** → `src/shared/hooks/`
- **Tauri command wrapper** → `src/commands/`
- **New Rust command** → `src-tauri/src/main.rs` (see [README: Adding New Tauri Commands](README.md#adding-new-tauri-commands))

## Code Style

### Frontend (TypeScript / React)

We use [Biome](https://biomejs.dev/) for formatting and linting. Key settings:

| Rule | Value |
|------|-------|
| Indent | Tabs |
| Quotes | Double (`"`) |
| Import organization | Auto-sorted by Biome |
| Lint ruleset | Biome recommended |
| `any` types | Warned — avoid where possible |

The TypeScript config uses **strict mode** with `noUnusedLocals` and `noUnusedParameters` enabled. Use the `@/` path alias for imports from `src/`:

```typescript
// Good
import { Button } from "@/components/ui/button";

// Bad
import { Button } from "../../../components/ui/button";
```

Run the formatter/linter:

```bash
npx biome check .          # Check for issues
npx biome check --write .  # Auto-fix
```

### Backend (Rust)

Standard `cargo fmt` formatting (no custom rustfmt.toml). Minimum Rust version: **1.70**.

```bash
cd src-tauri
cargo fmt          # Format
cargo clippy       # Lint
cargo check        # Type check
```

## Testing

We use [Vitest](https://vitest.dev/) with [@testing-library/react](https://testing-library.com/react) for frontend tests. Tests live alongside the code they test:

```
src/features/keys/keys-store.test.ts
src/features/keys/ValueViewer.test.tsx
src/shared/hooks/use-keyboard-shortcuts.test.ts
```

Tauri APIs are mocked globally in `src/test/setup.ts` — you don't need to set up mocks for `invoke`, `dialog`, `fs`, or `sonner` toast.

```bash
npm test              # Run all tests (single run)
npx vitest            # Run in watch mode
npx vitest <pattern>  # Run tests matching pattern
```

For the Rust backend:

```bash
cd src-tauri && cargo test
```

### Writing tests

- Co-locate tests next to the file they test: `foo.ts` → `foo.test.ts`
- Use `@testing-library/react` for component tests — query by role/text, not implementation details
- If your test needs a Tauri API not yet mocked in `src/test/setup.ts`, add the mock there

## Making Changes

### Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Verify everything works:
   ```bash
   npm run typecheck     # TypeScript
   npx biome check .     # Lint + format
   npm test              # Tests
   npm run tauri:dev     # Manual smoke test
   ```
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to your fork: `git push origin feature/my-feature`
7. Open a Pull Request

### Before submitting a PR

- [ ] `npm run typecheck` passes
- [ ] `npx biome check .` passes (or run `--write` to auto-fix)
- [ ] `npm test` passes
- [ ] `cd src-tauri && cargo check && cargo clippy` passes (if you changed Rust code)
- [ ] New features have tests
- [ ] No `as any` or `@ts-ignore` — fix the types instead

## Adding a Tauri Command

This is the most common type of contribution. The full pattern:

1. **Rust**: Add the command in `src-tauri/src/main.rs` and register it in `generate_handler![]`
2. **TypeScript wrapper**: Add an `invoke` wrapper in `src/commands/`
3. **Frontend**: Call the wrapper from your component or store

See the [README](README.md#adding-new-tauri-commands) for code examples.

## Roadmap

Check [ROADMAP.md](ROADMAP.md) for planned features. If you want to tackle something from the roadmap, open an issue first so we can coordinate.

## Questions?

Open an issue — happy to help.
