# API security notes

## Authentication

- **HR officers** sign in with email and password verified against `users.password_hash` (bcrypt). Sessions use the `hr_token` HttpOnly cookie (or `Authorization: Bearer` for scripts).
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

`GET /positions?scope=all` requires HR authentication and returns closed roles for admin UI.

## CSRF / cross-origin writes

Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) require an `Origin` or `Referer` host that matches `CORS_ORIGIN` / `APP_BASE_URL` (localhost allowed in non-production). This complements `SameSite=Lax` cookies.

## Deferred (not implemented here)

- Postgres row-level security and a limited DB role
- CAPTCHA on apply / presign / OTP
- Hono app-level IP rate limits (API Gateway throttling and OTP DB limits remain)

## Dependencies

`pnpm audit` is run at release time. Dev-only `esbuild` findings under `drizzle-kit` are pinned via `esbuild: "^0.25.0"` in `pnpm-workspace.yaml` overrides.
