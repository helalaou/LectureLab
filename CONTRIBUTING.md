# Contributing to LectureLab

Thanks for helping improve LectureLab. This guide covers the development workflow and the
conventions the project follows.

## Development setup

1. Fork and clone the repository, then run `npm install`.
2. Create a Firebase project for development and copy `.env.example` to `.env` (see the
   [README](README.md#getting-started)).
3. Run `npm run dev` and open <http://localhost:8888>.

## Before opening a pull request

Run the same checks as CI:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Guidelines

- **Keep changes focused.** One feature or fix per pull request, with a short description of the
  problem and the approach.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org):
  `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`, `build:`.
- **Code style** is enforced by Prettier and ESLint. Prefer small, typed functions, and keep
  components focused on rendering.
- **Configuration** belongs in `shared/` (app identity, settings, limits) or the env modules, not
  in scattered constants.
- **Prompts** live in `netlify/lib/prompts.ts`. When you change one, test it on a messy real
  transcript, a short pasted text, and a mix of slides and a recording. Describe what improved in
  the pull request.
- **Tests**: add or update unit tests when you change logic in `src/lib`, `netlify/lib` or
  `shared`.
- **Accessibility**: interactive elements need labels, keyboard support and sufficient contrast in
  both themes.

## Reporting bugs and requesting features

Use the issue templates. For bugs, include steps to reproduce, what you expected, and your browser
and device. For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public
issue.
