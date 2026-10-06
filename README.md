# LectureLab 🎓

**Record your classes, or upload old recordings, slides and notes, and get a full study kit:** clean notes, a summary, spaced-repetition flashcards, a practice quiz, a two-host study podcast, mind maps and diagrams, a glossary, an exam study guide, and a chat tutor that answers only from your lecture.

Built for community-college students. Free and open source (MIT). Runs on the free tiers of Firebase and Netlify.

| | |
|---|---|
| 🎙️ **Record live** | Plug in any mic and hit record. Audio is saved to the device as you go, so a closed tab or dead battery never loses a class. |
| 📚 **Multiple sources per lecture** | Mix recordings, audio/video files, PDFs, Word docs, text files and pasted notes. Every tool uses all of them together. |
| ✨ **8 study tools + chat** | Summary · Notes · Flashcards (SM-2 spaced repetition) · Quiz · Podcast (OpenAI TTS) · Visuals (Mermaid) · Glossary · Study guide · Ask-the-lecture |
| 📤 **Export** | PDF, Markdown, Anki deck, CSV (Quizlet/Excel) and MP3 |
| 📱 **Mobile-first** | Works great on phones. Light and dark mode. |
| 🔑 **Bring your own key** | The owner's OpenAI key is used only for emails in `ALLOWED_EMAILS`. Everyone else adds their own key in Settings (encrypted at rest). |

---

## How it works

```
Browser (React + Vite, on Netlify)
 ├─ Records audio → IndexedDB → splits into ~60 s WAV chunks
 ├─ Reads PDFs / DOCX locally (pdf.js, mammoth)
 ├─ Firebase Auth (Google or email link) + Firestore for data (security rules: users/{uid}/…)
 └─ Calls /api/* Netlify Functions for anything that needs OpenAI or file storage
        ├─ /api/transcribe  one audio chunk → text
        ├─ /api/generate    streams a study tool (prompts in netlify/lib/prompts.ts)
        ├─ /api/chat        streams tutor answers
        ├─ /api/tts         one podcast line → MP3
        ├─ /api/audio       audio files in Netlify Blobs (chunked upload, signed range playback)
        ├─ /api/key         save / remove a personal OpenAI key (AES-256-GCM)
        └─ /api/me          can this user use AI, and which key?
```

The functions verify the user's Firebase ID token and talk to Firestore **as that user** through the
REST API, so the same security rules apply everywhere and no service-account key is needed.

All prompts live in **`netlify/lib/prompts.ts`**. They're long and opinionated, and they're the best place to contribute.

---

## Setup (about 15 minutes)

### 1. Firebase (free Spark plan, no card needed)

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com). Analytics is optional.
2. **Project settings → Your apps → Add app → Web**. Copy the `apiKey`, `authDomain`, `projectId` and `appId`.
3. **Authentication → Sign-in method**: enable **Google**, and **Email/Password** with **Email link (passwordless)**.
4. **Firestore Database → Create database** (production mode), then **Rules**: paste [`firestore.rules`](firestore.rules) and click **Publish**.
5. After deploying, go to **Authentication → Settings → Authorized domains** and add your Netlify domain (`localhost` is already there).

### 2. Netlify

1. Push this folder to GitHub, then go to Netlify → **Add new site → Import from Git**. The build settings come from `netlify.toml`.
2. **Site configuration → Environment variables**, add:

   | Variable | Value |
   |---|---|
   | `VITE_FIREBASE_API_KEY` | from step 1.2 |
   | `VITE_FIREBASE_AUTH_DOMAIN` | from step 1.2 |
   | `VITE_FIREBASE_PROJECT_ID` | from step 1.2 |
   | `VITE_FIREBASE_APP_ID` | from step 1.2 |
   | `OPENAI_API_KEY` | Your OpenAI key (used only for allowlisted emails) |
   | `ALLOWED_EMAILS` | Comma-separated emails that may use your key, e.g. `you@gmail.com, neighbour@gmail.com` |
   | `KEY_ENCRYPTION_SECRET` | A random string, e.g. output of `openssl rand -base64 32` |

3. Deploy. Audio storage (Netlify Blobs) needs no setup.

> ⚠️ Don't change `KEY_ENCRYPTION_SECRET` later, or saved personal keys can't be decrypted. Users would just need to re-enter them.

### 3. Run locally

```bash
npm install
cp .env.example .env        # fill in the same values
npm run dev                  # Netlify Dev on http://localhost:8888 (site + functions + Blobs)
```

---

## Costs (default models)

| Step | Model | Approx. cost |
|---|---|---|
| Transcription | `gpt-transcribe` | ~$0.27 per hour of audio |
| Study tools / chat | `gpt-6-luna` | well under $0.01 per tool |
| Podcast audio | `gpt-4o-mini-tts` | ~$0.05–0.15 per episode |

Users can change models in **Settings → Advanced**. Every AI call is logged in Firestore under `users/{uid}/usage` (kind, amount, model, whether the shared key was used), so you can see in the Firebase console how much each person uses your key.

---

## Project layout

```
src/
  pages/            Home, LecturePage, RecordPage, SettingsPage, Login
  components/tools/ one view per study tool (Summary, Flashcards, Quiz, Podcast…)
  lib/audio/        recorder (AudioWorklet + MediaRecorder), chunker, WAV encoder, decoder, transcription
  lib/pipeline.ts   turns recordings/files/text into `sources` rows
  lib/genStore.ts   in-flight AI generations (survive tab switches)
  lib/db.ts         all Firestore reads/writes
  lib/storage.ts    audio upload/playback via /api/audio
netlify/
  functions/        API endpoints
  lib/prompts.ts    ← all AI prompts and JSON schemas
  lib/firestore.ts  tiny Firestore REST client (acts as the signed-in user)
firestore.rules
```

## Notes & limits

- Uploaded audio larger than 100 MB is transcribed but not stored for playback. Recordings made in the app are compressed (~15 MB per hour), so they're always stored.
- Firestore documents max out at 1 MB, so extremely long documents (several hundred pages) are trimmed.
- Scanned PDFs (images only) can't be read yet. OCR is a good first contribution.
- Transcription runs in ~1-minute pieces with quiet-point splitting. Transcript timestamps are approximate (±a few seconds).
- Netlify streaming functions can run up to 60 s. Very long lectures on the "detailed" setting may need the "standard" level.

## Contributing

PRs welcome! Ideas: OCR for scanned slides, cross-lecture exam prep, PWA install, sharing decks with classmates, more languages for the UI.

## License

MIT
