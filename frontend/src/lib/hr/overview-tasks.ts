import type { SeasonOverview } from "@/lib/api/overview"
import { pick } from "@/lib/hr/overview"
import { periodState } from "@/lib/hr/overview-schedule"

export type TaskState = "ready" | "blocked" | "watch"

export type WorkTask = {
  key: "interviews" | "decisions" | "release" | "emails" | "payments"
  title: string
  detail: string
  state: TaskState
  actionLabel: string
  href: string
  /** The one task the page puts forward: the first that is ready to act on. */
  primary: boolean
}

type Draft = Omit<WorkTask, "primary">

function candidates(overview: SeasonOverview, now: Date): Draft[] {
  const { attention, stages, schedule } = overview
  const drafts: Draft[] = []

  if (attention.noInterview > 0 && stages.applied > 0 && periodState(schedule.interviews, now) === "open") {
    drafts.push({
      key: "interviews",
      title: "Interview bookings",
      detail: `${attention.noInterview} ${pick(attention.noInterview, "applicant has", "applicants have")} not booked a slot.`,
      state: "watch",
      actionLabel: "Open interview grid",
      href: "/admin/hr/season",
    })
  }
  if (attention.undecided > 0) {
    drafts.push({
      key: "decisions",
      title: "Committee decisions",
      detail: `${attention.undecided} ${pick(attention.undecided, "application is", "applications are")} still pending.`,
      state: "ready",
      actionLabel: "Review pending",
      href: "/admin/hr?status=pending",
    })
  }
  if (attention.readyToRelease > 0) {
    const blocked = attention.undecided > 0
    drafts.push({
      key: "release",
      title: "Release results",
      detail: blocked
        ? "Blocked until every application is decided."
        : `${attention.readyToRelease} ${pick(attention.readyToRelease, "result is", "results are")} ready to release.`,
      state: blocked ? "blocked" : "ready",
      actionLabel: blocked ? "Open results" : "Release results",
      href: "/admin/hr/results",
    })
  }
  if (attention.emailProblems > 0) {
    drafts.push({
      key: "emails",
      title: "Result emails",
      detail: `${attention.emailProblems} ${pick(attention.emailProblems, "email", "emails")} failed or may not have arrived.`,
      state: "ready",
      actionLabel: "Review emails",
      href: "/admin/hr/results",
    })
  } else if (attention.emailsInFlight > 0) {
    drafts.push({
      key: "emails",
      title: "Result emails",
      detail: `${attention.emailsInFlight} ${pick(attention.emailsInFlight, "email is", "emails are")} still sending.`,
      state: "watch",
      actionLabel: "Watch progress",
      href: "/admin/hr/results",
    })
  }
  if (attention.paymentsToVerify > 0) {
    drafts.push({
      key: "payments",
      title: "Membership payments",
      detail: `${attention.paymentsToVerify} ${pick(attention.paymentsToVerify, "payment is", "payments are")} waiting for verification.`,
      state: "ready",
      actionLabel: "Verify payments",
      href: "/admin/hr/payments?tab=review",
    })
  }
  return drafts
}

const STATE_ORDER: Record<TaskState, number> = { ready: 0, blocked: 1, watch: 2 }

export function buildTasks(overview: SeasonOverview, now: Date): WorkTask[] {
  const drafts = candidates(overview, now)
    .map((task, index) => ({ task, index }))
    .sort((a, b) => STATE_ORDER[a.task.state] - STATE_ORDER[b.task.state] || a.index - b.index)
    .map(({ task }) => task)
  const firstReady = drafts.findIndex((task) => task.state === "ready")
  return drafts.map((task, index) => ({ ...task, primary: index === firstReady }))
}
