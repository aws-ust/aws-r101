export const UST_EMAIL_DOMAIN = "@ust.edu.ph"

/** Matches `OTP_RESEND_SECONDS` in `backend/src/lib/applicant-otp.ts`. */
export const APPLICANT_OTP_RESEND_SECONDS = 60

/**
 * Temporary interview-season bounds for scheduling grids.
 * Replace with HR-configured `/interview-window` when the backend supports it.
 */
export const INTERVIEW_SEASON = {
  startsAt: "2026-09-15T00:00:00+08:00",
  endsAt: "2026-10-31T23:59:59+08:00",
}
