import { cookies } from "next/headers"
import type { ApplicantApplication, ApplicantPayment } from "@/lib/api/applicant"

const API_BASE = process.env.API_URL ?? "http://localhost:8787"
const APPLICANT_AUTH_COOKIE_NAME = "applicant_token"

async function applicantServerFetch<T>(path: string): Promise<T | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(APPLICANT_AUTH_COOKIE_NAME)
  if (!token?.value) return null

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Cookie: `${APPLICANT_AUTH_COOKIE_NAME}=${token.value}` },
      cache: "no-store",
    })
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

export function getApplicantApplicationServer(): Promise<ApplicantApplication | null> {
  return applicantServerFetch<ApplicantApplication>("/applicant/application")
}

/** Null when it could not be loaded here; the dashboard then fetches it in the browser. */
export function getApplicantPaymentServer(): Promise<{ payment: ApplicantPayment | null } | null> {
  return applicantServerFetch<{ payment: ApplicantPayment | null }>("/applicant/payment")
}
