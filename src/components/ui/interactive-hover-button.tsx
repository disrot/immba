import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

type InteractiveHoverButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string
  target?: string
  rel?: string
}

export function InteractiveHoverButton({
  children,
  className,
  href,
  target,
  rel,
  ...props
}: InteractiveHoverButtonProps) {
  const classes = cn(
    "group apply-hover relative w-auto cursor-pointer overflow-hidden rounded-full border-0 bg-[#9fe870] px-6 text-center font-semibold text-[#163300]",
    className
  )
  const inner = (
    <>
      <span className="apply-hover-label">{children}</span>
      <span aria-hidden="true" className="apply-hover-reveal">
        <span>{children}</span>
        <ArrowRight aria-hidden="true" />
      </span>
    </>
  )

  if (href) {
    return (
      <a className={classes} href={href} rel={rel} target={target}>
        {inner}
      </a>
    )
  }

  return (
    <button className={classes} {...props}>
      {inner}
    </button>
  )
}
