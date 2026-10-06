const API_BASE = process.env.API_URL ?? "http://localhost:8787"

export type MemberVerification = {
  memberId: string
  fullName: string
  position: string
  academicYear: string
  status: "active" | "inactive"
}

export type MemberVerificationResult =
  | { kind: "found"; member: MemberVerification }
  | { kind: "not-found" }
  | { kind: "error" }

/** Looks up the member behind a "Scan to verify" QR on a member ID. */
export async function verifyMemberServer(memberId: string): Promise<MemberVerificationResult> {
  try {
    const response = await fetch(
      `${API_BASE}/members/verify/${encodeURIComponent(memberId)}`,
      { cache: "no-store" },
    )
    if (response.status === 404 || response.status === 400) return { kind: "not-found" }
    if (!response.ok) return { kind: "error" }
    return { kind: "found", member: (await response.json()) as MemberVerification }
  } catch {
    return { kind: "error" }
  }
}
