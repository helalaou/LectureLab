# Deploying to Netlify

LectureLab runs entirely on Netlify (web app, functions and audio storage) and Firebase (sign-in and
database). Both free tiers are enough for personal or small-group use.

## Before you start

- The repository is on GitHub (or GitLab or Bitbucket).
- You have finished the Firebase setup in the [README](../README.md#2-set-up-firebase).
- You have your Firebase web config, an OpenAI key and a random `KEY_ENCRYPTION_SECRET`
  (`openssl rand -base64 32`).

## 1. Create the site

1. Open [app.netlify.com](https://app.netlify.com) and choose **Add new project → Import an
   existing project**.
2. Connect GitHub and pick the `lecturelab` repository.
3. Netlify reads the build settings from `netlify.toml`, so leave them as they are:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
4. Before you deploy, open **Add environment variables** (or do it right after, under **Project
   configuration → Environment variables**) and add:

   | Key                         | Value                     |
   | --------------------------- | ------------------------- |
   | `VITE_FIREBASE_API_KEY`     | from Firebase             |
   | `VITE_FIREBASE_AUTH_DOMAIN` | from Firebase             |
   | `VITE_FIREBASE_PROJECT_ID`  | from Firebase             |
   | `VITE_FIREBASE_APP_ID`      | from Firebase             |
   | `KEY_ENCRYPTION_SECRET`     | your random secret        |
   | `OPENAI_API_KEY`            | optional shared key       |
   | `ALLOWED_EMAILS`            | optional, comma-separated |

   Mark `OPENAI_API_KEY` and `KEY_ENCRYPTION_SECRET` as **secret** so they are hidden in the UI and
   in deploy logs.

5. Click **Deploy**. The first build takes two to three minutes.

## 2. Allow your domain in Firebase

Google and email-link sign-in only work on domains Firebase trusts.

1. Copy your site's address, for example `https://lecturelab-yourname.netlify.app`.
2. In Firebase, open **Authentication → Settings → Authorized domains → Add domain** and add the
   domain without `https://`.
3. If you add a custom domain later, add it here too.

## 3. Check the deployment

1. Open the site and sign in with Google.
2. Go to **Settings**. The API key section should say that free access is enabled (for
   allowlisted emails) or ask for a key.
3. Create a lecture, paste a paragraph of text as a source, and generate a summary.

If something fails, open **Logs → Functions** in Netlify. Configuration problems show up there
with the name of the missing variable.

## Updating

Every push to `main` triggers a new deploy. Pull requests get deploy previews automatically. To
make sign-in work on a preview, add the preview domain to Firebase's authorized domains.

## Custom domain

In Netlify, open **Domain management → Add a domain**, follow the DNS instructions, and then add
the domain to Firebase's authorized domains as in step 2.

## Changing variables

Changes to environment variables take effect on the next deploy. Use **Deploys → Trigger deploy →
Deploy project without cache** after editing them.
