"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { hrFilterSelectClasses } from "@/lib/site/surface"
import { cn } from "@/lib/utils"

const triggerClasses = cn(hrFilterSelectClasses, "w-full")

export type FilterOption = { value: string; label: string; count: number }

type MembersFilterSelectProps = {
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  label: string
}

/** A dropdown whose options carry how many people each one holds. */
export function MembersFilterSelect({ value, options, onChange, label }: MembersFilterSelectProps) {
  const current = options.find((option) => option.value === value) ?? options[0]
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className={triggerClasses} aria-label={label}>
        <SelectValue>
          {current.label} ({current.count})
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label} ({option.count})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
