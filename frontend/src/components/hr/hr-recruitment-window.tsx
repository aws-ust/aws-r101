"use client"

import { type FormEvent, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/field"
import { Input } from "@/components/ui/input"
import {
  getRecruitmentWindow,
  patchRecruitmentWindow,
} from "@/lib/api"
import { fieldControlClasses, glassPanelClasses } from "@/lib/surface"

const panelClasses = `${glassPanelClasses} mt-8 px-5 py-5`
const formClasses = "mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
const messageClasses = "mt-3 font-sans text-sm text-prelude"
const errorClasses = "mt-3 font-sans text-sm text-aquamarine"

function toDatetimeLocal(iso: string | null) {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(localValue: string) {
  return new Date(localValue).toISOString()
}

export function HrRecruitmentWindow() {
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    getRecruitmentWindow()
      .then((window) => {
        if (cancelled) return
        setStartsAt(toDatetimeLocal(window.startsAt))
        setEndsAt(toDatetimeLocal(window.endsAt))
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the recruitment window."
        )
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setMessage("")
    setPending(true)
    try {
      const updated = await patchRecruitmentWindow(
        toIso(startsAt),
        toIso(endsAt)
      )
      setStartsAt(toDatetimeLocal(updated.startsAt))
      setEndsAt(toDatetimeLocal(updated.endsAt))
      setMessage("Recruitment week saved.")
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Could not save recruitment week."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={panelClasses}>
      <h2 className="font-sans text-lg font-semibold text-blue-chalk">
        Recruitment week
      </h2>
      <p className="mt-1 font-sans text-sm text-prelude">
        Applicants can change committees only between these dates.
      </p>
      <form className={formClasses} onSubmit={onSubmit}>
        <Field label="Starts" htmlFor="recruitment-start" required>
          <Input
            id="recruitment-start"
            type="datetime-local"
            required
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className={fieldControlClasses}
          />
        </Field>
        <Field label="Ends" htmlFor="recruitment-end" required>
          <Input
            id="recruitment-end"
            type="datetime-local"
            required
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className={fieldControlClasses}
          />
        </Field>
        <Button type="submit" color="cyan" disabled={pending}>
          {pending ? "Saving…" : "Save dates"}
        </Button>
      </form>
      {error ? (
        <p className={errorClasses} role="alert">
          {error}
        </p>
      ) : message ? (
        <p className={messageClasses}>{message}</p>
      ) : null}
    </section>
  )
}
