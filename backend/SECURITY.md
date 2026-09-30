# API security notes

## Authentication

- **Staff users** sign in with email and password verified against `users.password_hash` (bcrypt). Sessions use the `hr_token` HttpOnly cookie (or `Authorization: Bearer` for scripts). HR and admin users can access recruitment routes; finance users are restricted to membership-payment review routes.
- **Applicants** use email + application code + OTP. OTP codes are HMAC-hashed before storage; they are not stored in plaintext.
- HR JWT lifetime defaults to 8 hours (`JWT_EXPIRES_IN`). Applicant sessions default to 1 hour.

Integration tests require `DATABASE_URL` to point at a dedicated database whose name matches
`/(^|[_-])test([_-]|$)/`, such as `aws_ust_recruitment_test`; `testdb` does not match.

## Public endpoints (no HR/applicant session)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness |
| GET | `/positions` | Open positions only (`isOpen=true`) |
| GET | `/positions/:id/interview-slots` | Slot times and occupancy only |
| GET | `/recruitment-window` | Window bounds |
| GET | `/interview-window` | Interview window bounds |
| POST | `/applications` | Apply flow (Zod-validated) |
| POST | `/uploads/presign` | Upload session (throttled at API Gateway) |
| POST | `/applicant-auth/*` | OTP request/verify/logout |
| POST | `/auth/login` | HR login |
| POST | `/auth/logout` | Clears HR cookie |

## Membership payments

- Applicant payment routes require the existing Application ID + email OTP session.
- Receipt uploads are private S3 objects with exact size, checksum, MIME, and file-signature validation.
- Official payment QR uploads use the same private S3 bucket, validate exact upload metadata and image signatures, and are exposed to applicants only through short-lived signed download URLs.
- HR and admin users manage payment-period dates, group-chat links, opening/closing, and invitation delivery. Finance and admin users manage the amount and official accounts, and may verify or reject receipts.
- HR and admins may retry failed payment invitations, release final confirmations, and retry failed confirmation emails. Only admins may reverse a verification. HR and Finance may both view payment records and export verified members.
- A submitted receipt remains pending until manual verification. Member IDs are allocated only on verification and are retained when a verification is reversed so IDs are never reused.

`GET /positions?scope=all` requires HR authentication and returns closed roles for admin UI.

## CSRF / cross-origin writes

Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require an `Origin` or `Referer` host that matches `CORS_ORIGIN` / `APP_BASE_URL` (localhost allowed in non-production). This complements `SameSite=Lax` cookies.

## Deferred (not implemented here)

- Postgres row-level security and a limited DB role
- CAPTCHA on apply / presign / OTP
- Hono app-level IP rate limits (API Gateway throttling and OTP DB limits remain)

## Dependencies

`pnpm audit` is run at release time. Dev-only `esbuild` findings under `drizzle-kit` are pinned via `esbuild: "^0.25.0"` in `pnpm-workspace.yaml` overrides.
