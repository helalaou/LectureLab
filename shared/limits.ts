/** Size and length limits shared by the web app and the server functions. */

const MB = 1024 * 1024

/** Audio is uploaded to storage in parts of this size (keeps requests under function limits). */
export const AUDIO_PART_BYTES = 3 * MB

/** Recordings larger than this are transcribed but not kept for playback. */
export const MAX_STORED_AUDIO_BYTES = 100 * MB

/** Largest audio/video file the browser will try to decode. */
export const MAX_MEDIA_UPLOAD_BYTES = 500 * MB

/** Largest single transcription chunk accepted by /api/transcribe. */
export const MAX_TRANSCRIBE_CHUNK_BYTES = 5.5 * MB

/** Firestore documents are capped at 1 MB, so stored source text is trimmed to this length. */
export const MAX_SOURCE_CHARS = 700_000

/** Characters of combined source material sent to the model (~150k tokens). */
export const MAX_PROMPT_SOURCE_CHARS = 600_000

/** Lifetime of signed audio playback links. */
export const AUDIO_URL_TTL_SECONDS = 6 * 60 * 60

/** Length of each transcription chunk in seconds. */
export const TRANSCRIBE_CHUNK_SECONDS = 60
