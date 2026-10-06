# Architecture

This document explains how LectureLab is put together and why. For setup, see the
[README](../README.md); for hosting, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Components

| Layer        | Technology                     | Responsibility                                                             |
| ------------ | ------------------------------ | -------------------------------------------------------------------------- |
| Web app      | React 19, Vite, Tailwind CSS 4 | UI, recording, document text extraction, Firestore access                  |
| Auth         | Firebase Authentication        | Google and email-link sign-in, ID tokens                                   |
| Database     | Cloud Firestore                | Lectures, sources, generated outputs, chat, flashcard progress, settings   |
| API          | Netlify Functions (Node 22)    | Every call that needs a secret: OpenAI, key encryption, signed audio links |
| File storage | Netlify Blobs                  | Lecture recordings, uploaded audio and podcast MP3s                        |
| AI           | OpenAI                         | Transcription, text generation (structured outputs), text-to-speech        |

## Data model

All user data lives under `users/{uid}`, and the security rules allow access only when
`request.auth.uid == uid`.

```
users/{uid}
  settings                       user preferences (map)
  private/openai                 encrypted personal API key (ciphertext + last 4 chars)
  usage/{id}                     one entry per AI call (kind, amount, model, shared key?)
  courses/{courseId}             name, color
  lectures/{lectureId}           title, course_id, lecture_date, summary fields for the list view
    sources/{sourceId}           kind, title, content, segments[], status, storage_path
    outputs/{type}               one document per study tool (summary, notes, flashcards, …)
    chat/{messageId}             tutor conversation
    cards/{cardKey}              spaced-repetition state per flashcard
```

Field names use `snake_case` so documents read the same in the console, the web app and the
functions.

## Recording and transcription

1. `LectureRecorder` (`src/lib/audio/recorder.ts`) taps the microphone with an `AudioWorklet`,
   resamples to 16 kHz mono and cuts a WAV chunk at the quietest 50 ms window near every
   60-second mark (`chunker.ts`), so words are not split.
2. In parallel, `MediaRecorder` produces a compressed (~32 kbps) copy for playback.
3. Both streams are written to IndexedDB as they arrive. If the tab closes, the recording can be
   recovered from the Record page.
4. After you stop recording, the chunks are transcribed three at a time through `/api/transcribe`.
   The tail of the previous chunk's text is passed as context to keep terminology consistent.
   Segments are stored with approximate timestamps.
5. Uploaded files go through the same chunking after being decoded with `OfflineAudioContext`.

Chunking in the browser keeps every request well under the size and time limits of Netlify
Functions and avoids the output truncation that long single files can cause.

## Generation

`/api/generate` loads all ready sources for a lecture and builds the prompt with
`buildMessages()`. It then streams the model's output back as newline-delimited JSON (`delta`
events followed by `done`). Streaming keeps the connection alive for up to 60 seconds and lets the
UI show progress. Tools with a fixed shape (summary, flashcards, quiz, podcast, visuals, glossary)
use OpenAI structured outputs in strict mode, and their schemas are unit-tested for strict-mode
validity. Notes and the study guide are Markdown.

When generation finishes, the function writes the result to `outputs/{type}` using the caller's ID
token.

## Audio storage

Netlify Functions accept request bodies of about 6 MB, so `/api/audio` takes uploads in 3 MB parts
and stores them as separate blobs plus a metadata record. Playback uses short-lived HMAC-signed URLs.
The function answers HTTP range requests with at most one part per response, which is what audio
elements expect when seeking.

## Keys and access

`/api/me` and every AI endpoint resolve a key in this order:

1. The user's own key from `users/{uid}/private/openai`, decrypted with `KEY_ENCRYPTION_SECRET`.
2. The deployment's `OPENAI_API_KEY`, if the user's verified email is in `ALLOWED_EMAILS`.
3. Otherwise the request fails with `402 no_key`, and the UI sends the user to Settings.

## Configuration

| File                 | Contents                                              |
| -------------------- | ----------------------------------------------------- |
| `shared/app.ts`      | Product name, tagline, repository URL                 |
| `shared/settings.ts` | Settings type, defaults, model/voice/language options |
| `shared/limits.ts`   | Upload, storage, transcription and prompt limits      |
| `netlify/lib/env.ts` | Typed access to server environment variables          |
| `src/config/env.ts`  | Typed access to build-time `VITE_*` variables         |

## Testing

Unit tests (Vitest) cover the pure logic where mistakes are costly or easy to miss: resampling,
chunking, WAV encoding, spaced-repetition scheduling, exports, Firestore value encoding, key
encryption, signed URLs and prompt schemas. CI runs formatting, lint, typecheck, tests and a
production build on every push and pull request.
