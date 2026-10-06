# Security policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Report them privately through
[GitHub security advisories](https://github.com/helalaou/lecturelab/security/advisories/new).
Include a description, steps to reproduce and the potential impact.

You will get an acknowledgement within a few days. Once a fix is ready, it will be released and
the advisory published with credit, unless you prefer to stay anonymous.

## Scope

Areas of particular interest:

- Access to another user's data (Firestore rules, API functions)
- Exposure of personal or shared OpenAI API keys
- Bypassing signed audio links
- Injection through generated content (Markdown, Mermaid diagrams)

## Operator responsibilities

If you deploy LectureLab, keep `KEY_ENCRYPTION_SECRET` and `OPENAI_API_KEY` secret, restrict
`ALLOWED_EMAILS` to people you trust, and publish the provided `firestore.rules`.
