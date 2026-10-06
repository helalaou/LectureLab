# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- App icon, web app manifest and social preview metadata
- Centralized configuration in `shared/` and typed environment modules
- Unit tests with Vitest and a CI workflow (format, lint, typecheck, test, build)
- Contributing guide, security policy, code of conduct, architecture and deployment docs

### Changed

- Prompts and copy now serve any learner, not one kind of student
- Large pages split into focused components; contexts and providers separated

### Fixed

- Active lecture tab is centred when a deep link opens on a later tab

## [0.1.0]

### Added

- Live lecture recording with crash-safe local buffering
- Multiple sources per lecture: recordings, audio/video, PDF, Word, text and pasted notes
- Summary, study notes, flashcards with spaced repetition, practice quiz, study podcast, visuals,
  glossary, study guide and an "ask the lecture" tutor
- Export to PDF, Markdown, Anki, CSV and MP3
- Google and email-link sign-in, personal encrypted API keys and an allowlist for a shared key
