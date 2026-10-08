/**
 * Working-surface classes for the HR and applicant dashboards. Solid fills and
 * hairlines instead of glass: glass stays on dialogs and menus. Kept apart from
 * `glassPanelClasses`, which the public site and the payments pages still use.
 */

export const dashboardPanelClasses =
  "rounded-xl border border-blue-chalk/15 bg-haiti/60"

export const dashboardDividerClasses = "divide-y divide-blue-chalk/10"

/** Functional text never goes below 12px, even in dense tables. */
export const dashboardCaptionClasses = "font-sans text-xs text-prelude"

export const dashboardTitleClasses = "max-w-none text-balance text-2xl md:text-3xl"

/** 44px touch targets on coarse pointers, compact on mouse and trackpad. */
export const dashboardRowTargetClasses = "min-h-9 pointer-coarse:min-h-11"

/** Buttons keep their size on desktop and grow to 44px on touch screens. */
export const dashboardActionTargetClasses = "pointer-coarse:min-h-11"
