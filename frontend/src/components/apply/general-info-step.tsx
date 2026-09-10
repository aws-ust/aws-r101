"use client"

import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field } from "@/components/field"
import { APPLICANT_GENDER_OPTIONS } from "@/lib/applicant-gender"
import { fieldControlClasses } from "@/lib/surface"
import { UST_EMAIL_DOMAIN } from "@/lib/constants"

const gridClasses = "grid gap-5 sm:grid-cols-2"
const personalRowClasses = "grid gap-5 sm:col-span-2 sm:grid-cols-3"
const sectionEmailRowClasses = "grid gap-5 sm:grid-cols-2 sm:col-span-2"
const selectTriggerClasses = `${fieldControlClasses} justify-between`
const emailWrapClasses =
  "flex h-12 overflow-hidden rounded-[20px] bg-haiti/70 focus-within:ring-2 focus-within:ring-aquamarine/30"
const emailInputClasses =
  "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-4 text-sm text-blue-chalk shadow-none focus-visible:ring-0"
const domainClasses =
  "flex shrink-0 items-center pr-4 font-sans text-sm text-prelude"

export type GeneralInfoValues = {
  firstName: string
  lastName: string
  age: string
  birthday: string
  gender: string
  section: string
  emailLocal: string
}

type GeneralInfoStepProps = {
  values: GeneralInfoValues
  onChange: (patch: Partial<GeneralInfoValues>) => void
}

function lettersOnly(value: string) {
  return value.replace(/[^\p{L}\s'-]/gu, "")
}

function positiveDigits(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits === "" || Number(digits) <= 0) return ""
  return String(Number(digits))
}

export function GeneralInfoStep({ values, onChange }: GeneralInfoStepProps) {
  return (
    <div className={gridClasses}>
      <Field label="First Name" htmlFor="firstName" required>
        <Input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          placeholder="Juan"
          inputMode="text"
          value={values.firstName}
          onChange={(e) => onChange({ firstName: lettersOnly(e.target.value) })}
          className={fieldControlClasses}
        />
      </Field>
      <Field label="Last Name" htmlFor="lastName" required>
        <Input
          id="lastName"
          name="lastName"
          autoComplete="family-name"
          placeholder="Dela Cruz"
          inputMode="text"
          value={values.lastName}
          onChange={(e) => onChange({ lastName: lettersOnly(e.target.value) })}
          className={fieldControlClasses}
        />
      </Field>
      <div className={personalRowClasses}>
        <Field label="Age" htmlFor="age" required>
          <Input
            id="age"
            name="age"
            type="text"
            inputMode="numeric"
            pattern="[1-9][0-9]*"
            min={1}
            placeholder="21"
            value={values.age}
            onChange={(e) => onChange({ age: positiveDigits(e.target.value) })}
            className={fieldControlClasses}
          />
        </Field>
        <Field label="Birthday" htmlFor="birthday" required>
          <DatePicker
            id="birthday"
            required
            value={values.birthday}
            onChange={(birthday) => onChange({ birthday })}
            placeholder="Select birthday"
          />
        </Field>
        <Field label="Gender" htmlFor="gender" required>
          <Select
            value={values.gender || null}
            onValueChange={(gender: string | null) =>
              onChange({ gender: gender ?? "" })
            }
          >
            <SelectTrigger id="gender" className={selectTriggerClasses}>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {APPLICANT_GENDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className={sectionEmailRowClasses}>
        <Field label="Year & Section" htmlFor="section" required>
          <Input
            id="section"
            name="section"
            value={values.section}
            placeholder="3ISB"
            onChange={(e) => onChange({ section: e.target.value })}
            className={fieldControlClasses}
          />
        </Field>
        <Field label="UST Email" htmlFor="emailLocal" required>
          <div className={emailWrapClasses}>
            <Input
              id="emailLocal"
              name="emailLocal"
              autoComplete="username"
              placeholder="juan.delacruz"
              value={values.emailLocal}
              onChange={(e) =>
                onChange({
                  emailLocal: e.target.value.replace(/@.*$/, ""),
                })
              }
              className={emailInputClasses}
            />
            <span className={domainClasses}>{UST_EMAIL_DOMAIN}</span>
          </div>
        </Field>
      </div>
    </div>
  )
}
