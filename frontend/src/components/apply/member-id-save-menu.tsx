"use client"

import { Download } from "lucide-react"
import { buttonVariants } from "@/components/ui/button-variants"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { IdCardExportSide } from "@/lib/members/id-card-export"

const triggerClasses = buttonVariants({ color: "purple", className: "gap-2 px-4" })
const menuClasses =
  "min-w-[12.5rem] rounded-[14px] border border-blue-chalk/25 bg-haiti p-1 text-blue-chalk shadow-md ring-1 ring-blue-chalk/15"
const itemClasses =
  "cursor-pointer rounded-md px-2 py-2 font-sans text-sm text-blue-chalk transition-colors data-highlighted:bg-biloba-flower data-highlighted:text-haiti"

const options: { side: IdCardExportSide; label: string }[] = [
  { side: "front", label: "Front" },
  { side: "back", label: "Back" },
  { side: "both", label: "Front and back" },
]

type MemberIdSaveMenuProps = {
  pending: boolean
  onSave: (side: IdCardExportSide) => void
}

export function MemberIdSaveMenu({ pending, onSave }: MemberIdSaveMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger type="button" className={triggerClasses} disabled={pending}>
        <Download className="size-4" aria-hidden />
        {pending ? "Saving…" : "Save Image"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className={menuClasses}>
        {options.map((option) => (
          <DropdownMenuItem key={option.side} className={itemClasses} onClick={() => onSave(option.side)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
