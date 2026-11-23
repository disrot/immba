import React from "react"

import { cn } from "@/lib/utils"

type As = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span"

type KineticTextProps = React.HTMLAttributes<HTMLElement> & {
  text: string
  as?: As
}

const letterClass =
  "[will-change:font-weight,-webkit-text-stroke-width,padding] [-webkit-text-stroke-color:transparent] [-webkit-text-stroke-width:var(--text-stroke-width)] [transition:font-weight_0.4s,_-webkit-text-stroke-color_0.4s,_padding_0.4s] hover:[padding-inline:var(--hover-padding)] hover:font-[900] hover:[-webkit-text-stroke-color:currentcolor] hover:[-webkit-text-stroke-width:calc(var(--text-stroke-width)*2)] has-[+span+span:hover]:font-[400] has-[+span:hover]:[padding-inline:var(--hover-padding)] has-[+span:hover]:font-[600] [:hover+&]:[padding-inline:var(--hover-padding)] [:hover+&]:font-[600] [:hover+span+&]:font-[400]"

type Piece = { text: string; gap: boolean }

/** One hover target per word. A zero-width space splits Chinese phrases without showing a gap. */
const pieces = (text: string): Piece[] => {
  const parts = text.split(/(\s+|\u200b)/)
  const out: Piece[] = []
  parts.forEach((part, index) => {
    if (!part || part === "\u200b" || /^\s+$/.test(part)) return
    const next = parts[index + 1] ?? ""
    out.push({ text: part, gap: /^\s+$/.test(next) })
  })
  return out
}

export function KineticText({
  text,
  as: Tag = "h1",
  className = "",
  style,
  ...rest
}: KineticTextProps) {
  const mergedStyle = {
    "--hover-padding": "calc(1em / 12)",
    "--text-stroke-width": "calc(1em * 125 / 6000)",
    ...(style as React.CSSProperties | undefined),
  } as React.CSSProperties

  return (
    <Tag
      {...rest}
      className={cn("flex flex-wrap font-[300]", className)}
      style={mergedStyle}
    >
      {pieces(text).map((piece, i) => (
        <span
          key={`${piece.text}-${i}`}
          aria-hidden="true"
          className={cn(letterClass, "whitespace-nowrap")}
          style={piece.gap ? { marginRight: "0.28em" } : undefined}
        >
          {piece.text}
        </span>
      ))}
      <span className="sr-only">{text}</span>
    </Tag>
  )
}
