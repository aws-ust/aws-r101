# Gmail API setup (AWS Builders UST recruitment)

Backend-only. Never commit OAuth secrets to git.

## Prerequisites

- Google Cloud project with **Gmail API** enabled
- OAuth consent screen configured (Internal or External per org policy)
- OAuth 2.0 **Web** client (or Desktop) with offline access

## One-time refresh token

1. In Google Cloud Console → APIs & Services → Credentials, open your OAuth client.
2. Add **Authorized redirect URI**: `https://developers.google.com/oauthplayground`
3. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
4. Click the gear icon → enable **Use your own OAuth credentials** → paste client id and secret.
5. In Step 1, select scope: `https://www.googleapis.com/auth/gmail.send`
6. Authorize APIs. Sign in as the mailbox that can send as `aws.cics@ust.edu.ph`.
7. In Step 2, **Exchange authorization code for tokens** and copy the **refresh token**.
8. Put values in repo root `.env` (see `.env.example`).

The authorized Google account must be allowed to send with:

```
From: AWS Builders - UST <aws.cics@ust.edu.ph>
```

If using a personal Google account, add `aws.cics@ust.edu.ph` as a **Send mail as** alias in Gmail settings.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | OAuth client id |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token |
| `GOOGLE_SENDER_NAME` | Display name in From header |
| `GOOGLE_SENDER_EMAIL` | From address (`aws.cics@ust.edu.ph`) |
| `GOOGLE_REPLY_TO_EMAIL` | Reply-To header |
| `GOOGLE_SIGNATORY_NAME` | Email sign-off (Claire) |
| `MESSENGER_GC_LINK` | Accepted-result template GC URL |
| `APP_BASE_URL` | Links in submission email |
| `EMAIL_ENABLED` | `false` in smoke/CI; `true` for live sends |
| `RECRUITMENT_YEAR` | Application code year segment |

## Email subjects

| Template | Subject line |
|----------|----------------|
| Application submitted | `AWS Builders UST — Application received ({applicationCode})` |
| Accepted result | `Welcome Aboard! Your AWS Builders - UST R1O1 Results` |
| Rejected result | `AWS Builders - UST R1O1 Recruitment Results` |

Canonical strings live in [`backend/src/lib/email/subjects.ts`](../src/lib/email/subjects.ts).

## Helper script

```bash
npx tsx backend/scripts/gmail-oauth-setup.ts
```

Prints the authorize URL and exchanges an authorization code for a refresh token when run interactively.

## Local verification

1. Set `EMAIL_ENABLED=true` and a valid `GOOGLE_REFRESH_TOKEN` in `.env`.
2. Start backend: `cd backend && pnpm dev`
3. Submit the apply form or `POST /applications`.
4. Check inbox for the submission email and HR `GET /applications/:id/email-notifications` for a `sent` row.

## Smoke tests

`backend/smoke-test.sh` sets `EMAIL_ENABLED=false` by default. Submission still logs an `email_notifications` row with `status: failed` and `lastError: email disabled`.

## Security

- No `GOOGLE_*` variables in the frontend.
- Do not log refresh tokens or client secrets.
- Rotate credentials if they are exposed.
