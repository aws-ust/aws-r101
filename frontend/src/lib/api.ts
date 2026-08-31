import { useSyncExternalStore } from "react"
import type {
  Application,
  ApplicationStatus,
  CreateApplicationInput,
  Position,
} from "./application-types"
import { POSITIONS, SEED_APPLICATIONS } from "./mock-applications"

let applications: Application[] = SEED_APPLICATIONS.map((app) => ({
  ...app,
  choices: app.choices.map((choice) => ({ ...choice })),
  documents: app.documents.map((doc) => ({ ...doc })),
}))

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot() {
  return applications
}

export function useApplications() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function useApplication(id: string) {
  const apps = useApplications()
  return apps.find((app) => app.id === id) ?? null
}

export function getPositions(): Position[] {
  return POSITIONS
}

export function getApplication(id: string) {
  return applications.find((app) => app.id === id) ?? null
}

export function createApplication(input: CreateApplicationInput): Application {
  const choices = input.choices.map((choice) => {
    const position = POSITIONS.find((item) => item.id === choice.positionId)
    if (!position) {
      throw new Error(`Unknown position: ${choice.positionId}`)
    }
    return {
      preferenceRank: choice.preferenceRank,
      positionId: position.id,
      committee: position.committee,
      title: position.title,
    }
  })

  const application: Application = {
    id: crypto.randomUUID(),
    status: "pending",
    submittedAt: new Date().toISOString(),
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    age: input.age,
    section: input.section,
    motivation: input.motivation,
    choices,
    documents: input.documents.map((doc) => ({
      documentType: doc.documentType,
      fileName: doc.fileName,
      s3Key: null,
    })),
  }

  applications = [application, ...applications]
  emit()
  return application
}

export function patchApplicationStatus(id: string, status: ApplicationStatus) {
  applications = applications.map((app) =>
    app.id === id ? { ...app, status } : app
  )
  emit()
  return getApplication(id)
}

export function fullName(app: Application) {
  return `${app.firstName} ${app.lastName}`
}

export function firstChoiceCommittee(app: Application) {
  return (
    app.choices.find((choice) => choice.preferenceRank === 1)?.committee ?? "—"
  )
}

export function formatAppliedDate(iso: string) {
  const [year, month, day] = iso.slice(0, 10).split("-")
  return `${Number(month)}/${Number(day)}/${year}`
}
