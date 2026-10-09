import assert from "node:assert/strict"
import test from "node:test"
import type { SeasonOverview } from "../api/overview"
import { buildStations } from "./overview"
import { buildBriefing } from "./overview-briefing"
import { buildSchedule } from "./overview-schedule"
import { buildTasks } from "./overview-tasks"

const NOW = new Date("2026-10-08T04:00:00+08:00")

function overview(patch: {
  stages?: Partial<SeasonOverview["stages"]>
  attention?: Partial<SeasonOverview["attention"]>
  schedule?: Partial<SeasonOverview["schedule"]>
}): SeasonOverview {
  return {
    recruitmentYear: 2026,
    stages: { applied: 39, interviewBooked: 30, decided: 21, released: 0, paymentSent: 0, member: 0, ...patch.stages },
    attention: {
      undecided: 18,
      readyToRelease: 21,
      emailProblems: 0,
      emailsInFlight: 0,
      paymentsToVerify: 0,
      noInterview: 0,
      ...patch.attention,
    },
    schedule: {
      applications: { startsAt: "2026-10-01T00:00:00+08:00", endsAt: "2026-10-07T23:59:00+08:00" },
      interviews: { startsAt: "2026-10-09T09:00:00+08:00", endsAt: "2026-10-12T18:00:00+08:00" },
      payments: null,
      ...patch.schedule,
    },
  }
}

test("briefing says what blocks the release while decisions are pending", () => {
  const briefing = buildBriefing(overview({}), NOW)
  assert.equal(briefing.headline, "21 of 39 applications are decided.")
  assert.deepEqual(briefing.lines, ["Results cannot be released until every decision is in."])
})

test("briefing says results are ready once every application is decided", () => {
  const briefing = buildBriefing(
    overview({ stages: { decided: 39 }, attention: { undecided: 0, readyToRelease: 39 } }),
    NOW,
  )
  assert.equal(briefing.headline, "All 39 applications are decided.")
  assert.deepEqual(briefing.lines, ["Results are ready to release."])
})

test("briefing before applications open and when nothing is set up", () => {
  const empty = { stages: { applied: 0, decided: 0 }, attention: { undecided: 0, readyToRelease: 0 } }
  const upcoming = buildBriefing(
    overview({ ...empty, schedule: { applications: { startsAt: "2026-10-20T00:00:00+08:00", endsAt: "2026-10-27T00:00:00+08:00" } } }),
    NOW,
  )
  assert.equal(upcoming.headline, "Applications open on Oct 20.")
  assert.equal(buildBriefing(overview({ ...empty, schedule: { applications: null } }), NOW).headline, "Applications have not been set up yet.")
})

test("only the first ready task is primary, and release is blocked until decided", () => {
  const tasks = buildTasks(overview({}), NOW)
  assert.deepEqual(
    tasks.map((task) => [task.key, task.state, task.primary]),
    [
      ["decisions", "ready", true],
      ["release", "blocked", false],
    ],
  )
  const released = buildTasks(overview({ attention: { undecided: 0, readyToRelease: 39 } }), NOW)
  assert.deepEqual(released.map((task) => [task.key, task.state, task.primary]), [["release", "ready", true]])
})

test("tasks list failed emails, in-flight emails and payments, and nothing when caught up", () => {
  const busy = buildTasks(
    overview({ attention: { undecided: 0, readyToRelease: 0, emailProblems: 4, paymentsToVerify: 1 } }),
    NOW,
  )
  assert.deepEqual(busy.map((task) => task.key), ["emails", "payments"])
  const sending = buildTasks(overview({ attention: { undecided: 0, readyToRelease: 0, emailsInFlight: 12 } }), NOW)
  assert.deepEqual(sending.map((task) => [task.key, task.state, task.primary]), [["emails", "watch", false]])
  assert.deepEqual(buildTasks(overview({ attention: { undecided: 0, readyToRelease: 0 } }), NOW), [])
})

test("schedule shows each period as open, upcoming, closed or not set", () => {
  const rows = buildSchedule(overview({}), NOW)
  assert.deepEqual(
    rows.map((row) => [row.key, row.state, row.note]),
    [
      ["applications", "closed", "Closed"],
      ["interviews", "upcoming", "Opens in 2 days"],
      ["payments", "not-set", "Not set"],
    ],
  )
  const open = buildSchedule(
    overview({ schedule: { applications: { startsAt: "2026-10-01T00:00:00+08:00", endsAt: "2026-10-11T23:59:00+08:00" } } }),
    NOW,
  )
  assert.equal(open[0].note, "Closes in 4 days")
  assert.equal(open[0].range, "Oct 1 – Oct 11")
})

test("a station before the one that needs work is only done when something reached it", () => {
  const states = buildStations(overview({ stages: { interviewBooked: 0 } })).map((station) => [station.key, station.state])
  assert.deepEqual(states, [
    ["applied", "done"],
    ["interviewBooked", "ahead"],
    ["decided", "current"],
    ["released", "ahead"],
    ["paymentSent", "ahead"],
    ["member", "ahead"],
  ])
  const idle = buildStations(overview({ attention: { undecided: 0, readyToRelease: 0 } }))
  assert.ok(idle.every((station) => station.state === "idle"))
})

test("the interview task only shows once interviews are open, and watching tasks come last", () => {
  const withBacklog = { attention: { noInterview: 39 } }
  assert.ok(!buildTasks(overview(withBacklog), NOW).some((task) => task.key === "interviews"))
  const open = overview({
    ...withBacklog,
    schedule: { interviews: { startsAt: "2026-10-07T09:00:00+08:00", endsAt: "2026-10-12T18:00:00+08:00" } },
  })
  const tasks = buildTasks(open, NOW)
  assert.deepEqual(
    tasks.map((task) => [task.key, task.state]),
    [
      ["decisions", "ready"],
      ["release", "blocked"],
      ["interviews", "watch"],
    ],
  )
})

test("the schedule is in date order, with periods that are not set last, and a closed window is just closed", () => {
  const rows = buildSchedule(
    overview({
      schedule: {
        applications: null,
        interviews: { startsAt: "2026-10-09T09:00:00+08:00", endsAt: "2026-10-12T18:00:00+08:00" },
        payments: { startsAt: "2026-10-01T00:00:00+08:00", endsAt: "2026-10-06T00:00:00+08:00" },
      },
    }),
    NOW,
  )
  assert.deepEqual(
    rows.map((row) => [row.key, row.note]),
    [
      ["payments", "Closed"],
      ["interviews", "Opens in 2 days"],
      ["applications", "Not set"],
    ],
  )
})
