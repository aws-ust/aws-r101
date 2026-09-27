import { cookies } from "next/headers"

const API_BASE = process.env.API_URL ?? "http://localhost:8787"

export type StaffSession = {
  email: string
  role: "hr" | "admin" | "finance"
}

export async function getServerSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("hr_token")
  if (!token?.value) return null

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Cookie: `hr_token=${token.value}` },
      cache: "no-store",
    })
    if (!response.ok) {
      cookieStore.delete("hr_token")
      return null
    }
    return (await response.json()) as StaffSession
  } catch {
    return null
  }
}
