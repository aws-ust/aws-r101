import type { MemberEntry, MemberFilter } from "@/lib/members/directory"
import { ROLE_LABELS } from "@/lib/members/directory"
import { cn } from "@/lib/utils"

const wrapClasses = "overflow-x-auto rounded-[20px] border border-blue-chalk/15 bg-haiti/55"
const tableClasses = "w-full min-w-[44rem] border-collapse text-left"
const headClasses =
  "border-b border-blue-chalk/15 font-mono text-[10px] tracking-[0.14em] text-prelude"
const headCellClasses = "px-4 py-3 font-normal"
const rowClasses = "border-b border-blue-chalk/10 last:border-b-0"
const cellClasses = "px-4 py-3 align-top font-sans text-sm text-blue-chalk"
const nameClasses = "font-semibold"
const monoClasses = "font-mono text-xs tabular-nums text-prelude"
const emptyClasses = "font-sans text-sm text-prelude"
const pillBaseClasses =
  "inline-flex w-fit whitespace-nowrap rounded-pill px-3 py-0.5 font-mono text-[10px] font-medium"
const pillClasses: Record<Exclude<MemberFilter, "all">, string> = {
  eb: "bg-biloba-flower text-haiti",
  director: "bg-daisy-bush text-blue-chalk",
  ea: "bg-daisy-bush/70 text-blue-chalk",
  staff: "bg-aquamarine text-haiti",
  general: "bg-haiti text-prelude ring-1 ring-blue-chalk/20",
}

export function HrMemberList({ entries }: { entries: MemberEntry[] }) {
  if (entries.length === 0) {
    return <p className={emptyClasses}>No one matches that search.</p>
  }
  return (
    <div className={wrapClasses}>
      <table className={tableClasses}>
        <thead>
          <tr className={headClasses}>
            <th className={headCellClasses}>Name</th>
            <th className={headCellClasses}>Position</th>
            <th className={headCellClasses}>Role</th>
            <th className={headCellClasses}>Member ID</th>
            <th className={headCellClasses}>Student No.</th>
            <th className={headCellClasses}>Section</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.key} className={rowClasses}>
              <td className={cn(cellClasses, nameClasses)}>{entry.fullName}</td>
              <td className={cellClasses}>{entry.position}</td>
              <td className={cellClasses}>
                <span className={cn(pillBaseClasses, pillClasses[entry.role])}>
                  {ROLE_LABELS[entry.role]}
                </span>
              </td>
              <td className={cn(cellClasses, monoClasses)}>{entry.memberId ?? "—"}</td>
              <td className={cn(cellClasses, monoClasses)}>{entry.studentNumber ?? "—"}</td>
              <td className={cn(cellClasses, monoClasses)}>{entry.section ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
