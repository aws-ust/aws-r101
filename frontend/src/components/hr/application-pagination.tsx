"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

const footerClasses =
  "mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between"
const summaryClasses = "font-mono text-xs tracking-wide text-prelude"

const PAGE_SIZE = 10

export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

export function pageSlice<T>(items: T[], page: number) {
  const start = (page - 1) * PAGE_SIZE
  return items.slice(start, start + PAGE_SIZE)
}

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages: (number | "ellipsis")[] = [1]

  if (current > 3) {
    pages.push("ellipsis")
  }

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let page = start; page <= end; page += 1) {
    pages.push(page)
  }

  if (current < total - 2) {
    pages.push("ellipsis")
  }

  pages.push(total)
  return pages
}

type ApplicationPaginationProps = {
  total: number
  page: number
  onPageChange: (page: number) => void
}

export function ApplicationPagination({
  total,
  page,
  onPageChange,
}: ApplicationPaginationProps) {
  const totalPages = pageCount(total)
  const safePage = Math.min(page, totalPages)
  const start = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const end = Math.min(safePage * PAGE_SIZE, total)
  const pages = buildPageList(safePage, totalPages)

  if (total === 0) {
    return null
  }

  return (
    <div className={footerClasses}>
      <p className={summaryClasses}>
        Showing {start}–{end} of {total} applications
      </p>

      {totalPages > 1 ? (
        <Pagination className="sm:mx-0 sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={safePage <= 1}
                onClick={() => onPageChange(safePage - 1)}
              />
            </PaginationItem>

            {pages.map((entry, index) =>
              entry === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    isActive={entry === safePage}
                    onClick={() => onPageChange(entry)}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                disabled={safePage >= totalPages}
                onClick={() => onPageChange(safePage + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}
