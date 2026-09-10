import { ApiError } from "./api-client"
import {
  readApiErrorMessage,
  userFacingApiError,
} from "./api-error-message"

const API_BASE = "/api/applicant-auth"

export type ApplicantIdentity = {
  applicationCode: string
  email: string
}

async function applicantAuthFetch<T>(
  path: string,
  body: Record<string, string>
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const serverMessage = await readApiErrorMessage(response)
    throw new ApiError(
      response.status,
      userFacingApiError(
        response.status,
        serverMessage,
        response.status === 401
          ? "The verification code is invalid or expired."
          : "Could not verify your code. Try again in a moment."
      )
    )
  }

  return response.json() as Promise<T>
}

export function requestApplicantCode(identity: ApplicantIdentity) {
  return applicantAuthFetch<{ message: string }>("/request-code", identity)
}

export function verifyApplicantCode(
  identity: ApplicantIdentity & { code: string }
) {
  return applicantAuthFetch<{
    applicationCode: string
    expiresAt: string
  }>("/verify-code", identity)
}
