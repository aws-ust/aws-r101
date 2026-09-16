import fs from "node:fs"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")

const replacements = [
  ["@/lib/hr-application-types", "@/lib/types/hr-application"],
  ["@/lib/application-types", "@/lib/types/application"],
  ["@/lib/hr-applications-csv", "@/lib/hr/applications-csv"],
  ["@/lib/hr-filters-search-params", "@/lib/hr/filters-search-params"],
  ["@/lib/applicant-session-server", "@/lib/auth/applicant-session-server"],
  ["@/lib/applicant-auth-api", "@/lib/api/applicant-auth"],
  ["@/lib/apply-field-validation", "@/lib/apply/field-validation"],
  ["@/lib/applicant-gender", "@/lib/apply/applicant-gender"],
  ["@/lib/recruitment-window-season", "@/lib/season/recruitment-window"],
  ["@/lib/home-splash-cloud-layout", "@/lib/site/home-splash-cloud-layout"],
  ["@/lib/public-gallery-image", "@/lib/site/public-gallery-image"],
  ["@/lib/committee-quiz-score", "@/lib/quiz/score"],
  ["@/lib/committee-quiz-data", "@/lib/quiz/data"],
  ["@/lib/api-error-message", "@/lib/api/error-message"],
  ["@/lib/applicant-api", "@/lib/api/applicant"],
  ["@/lib/api-client", "@/lib/api/client"],
  ["@/lib/committee-groups", "@/lib/apply/committee-groups"],
  ["@/lib/committee-apply", "@/lib/apply/committee"],
  ["@/lib/document-upload", "@/lib/apply/document-upload"],
  ["@/lib/display-datetime", "@/lib/datetime/display"],
  ["@/lib/datetime-local", "@/lib/datetime/datetime-local"],
  ["@/lib/reveal-section-event", "@/lib/site/reveal-section-event"],
  ["@/lib/navigation-motion", "@/lib/site/navigation-motion"],
  ["@/lib/scroll-to-section", "@/lib/site/scroll-to-section"],
  ["@/lib/events-schedule", "@/lib/site/events-schedule"],
  ["@/lib/interview-season", "@/lib/season/interview"],
  ["@/lib/recruitment-season", "@/lib/season/recruitment"],
  ["@/lib/positions-server", "@/lib/positions/server"],
  ["@/lib/session-server", "@/lib/auth/session-server"],
  ["@/lib/about-events", "@/lib/site/about-events"],
  ["@/lib/home-splash", "@/lib/site/home-splash"],
  ["@/lib/site-nav", "@/lib/site/nav"],
  ["@/lib/use-otp-resend-cooldown", "@/hooks/use-otp-resend-cooldown"],
  ["@/lib/date-local", "@/lib/datetime/date-local"],
]

const walkRoots = [
  path.join(root, "src"),
  path.resolve(root, "..", "package.json"),
  path.resolve(root, "..", "authentication-flow.md"),
]

function walkDir(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    if (fs.statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue
      walkDir(full, files)
    } else if (/\.(tsx?|md|json|mjs)$/.test(name)) {
      files.push(full)
    }
  }
  return files
}

const files = [
  ...walkDir(path.join(root, "src")),
  path.resolve(root, "..", "package.json"),
  path.resolve(root, "..", "authentication-flow.md"),
].filter((f) => fs.existsSync(f))

for (const file of files) {
  if (file.includes("migrate-lib-imports.mjs")) continue
  let content = fs.readFileSync(file, "utf8")
  let changed = false
  for (const [from, to] of replacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to)
      changed = true
    }
  }
  if (changed) fs.writeFileSync(file, content)
}

console.log("Import paths updated.")
