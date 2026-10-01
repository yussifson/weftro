import { useTranslation } from "react-i18next";
import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button";

const Pagination = (
  {
    className,
    ...props
  }
) => {
  const { t } = useTranslation();
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props} />
  );
}
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn("flex flex-row items-center gap-2", className)}
      {...props} />
  );
})
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef(({ className, ...props }, ref) => {
  return (<li ref={ref} className={cn("", className)} {...props} />);
})
PaginationItem.displayName = "PaginationItem"

const PaginationLink = (
  {
    className,
    isActive,
    size = "icon",
    ...props
  }
) => {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size}), className)}
      {...props} />
  );
}
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({ className, ...props }) => {
  const { t } = useTranslation();
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn("gap-2 pl-2.5", className)}
      {...props}>
      <ChevronLeft className="h-4 w-4" />
      <span>{t("previous", "Previous")}</span>
    </PaginationLink>
  );
}
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({ className, ...props }) => {
  const { t } = useTranslation();
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn("gap-2 pr-2.5", className)}
      {...props}>
      <span>{t("next", "Next")}</span>
      <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  );
}
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({ className, ...props }) => {
  const { t } = useTranslation();
  return (
    <span
      aria-hidden
      className={cn("flex h-8 w-8 items-center justify-center text-[13px]", className)}
      {...props}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">{t("more_pages", "More pages")}</span>
    </span>
  );
}
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis}
