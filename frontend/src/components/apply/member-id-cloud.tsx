import { cn } from "@/lib/utils"

// A flat cloud built from a pill and three puffs, sized by its container so
// it scales with the card. No gradients: one solid fill per cloud.
const puffClasses = "absolute rounded-full"
const baseClasses = "absolute inset-x-0 bottom-0 h-[56%] rounded-full"
const firstPuffClasses = "bottom-[30%] left-[12%] aspect-square w-[38%]"
const secondPuffClasses = "bottom-[34%] left-[38%] aspect-square w-[46%]"
const thirdPuffClasses = "bottom-[24%] right-[4%] aspect-square w-[30%]"

type MemberIdCloudProps = {
  /** Size and position, e.g. "absolute left-4 top-10 h-12 w-24". */
  className: string
  /** Solid fill, e.g. "bg-white" or "bg-daisy-bush". */
  fillClassName: string
}

export function MemberIdCloud({ className, fillClassName }: MemberIdCloudProps) {
  return (
    <div className={className} aria-hidden>
      <span className={cn(baseClasses, fillClassName)} />
      <span className={cn(puffClasses, firstPuffClasses, fillClassName)} />
      <span className={cn(puffClasses, secondPuffClasses, fillClassName)} />
      <span className={cn(puffClasses, thirdPuffClasses, fillClassName)} />
    </div>
  )
}
