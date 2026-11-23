import { useId, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Menu, X } from "lucide-react";

export type FluidMenuItem = {
  id: string;
  label: string;
  icon: ReactNode;
  current?: boolean;
  onSelect: () => void;
};

const STEP = 48;

/**
 * Circular menu that opens upward. Overlapping discs share one blur
 * filter so the stack reads as a single liquid shape.
 */
export function FluidMenu({
  items,
  openLabel,
  closeLabel,
}: {
  items: FluidMenuItem[];
  openLabel: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const rawId = useId().replace(/:/g, "");
  const filterId = `fluid-${rawId}`;
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 520, damping: 32, mass: 0.7 };

  return (
    <div className="pointer-events-none fixed right-5 bottom-24 z-[80]" data-fluid-menu-root>
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <div className="relative h-14 w-14">
        {items.map((item, index) => (
          <motion.span
            key={item.id}
            className="absolute right-24 bottom-2 whitespace-nowrap rounded-xl border border-[#e6e4dd] bg-white px-2.5 py-1 text-sm text-[#163300] shadow-[0_8px_20px_rgba(20,26,20,0.08)]"
            initial={false}
            animate={{
              y: open ? -((index + 1) * STEP) : 0,
              opacity: open ? 1 : 0,
            }}
            transition={spring}
            aria-hidden={!open}
          >
            {item.label}
          </motion.span>
        ))}
        <div className="absolute inset-0 overflow-visible" style={{ filter: `url(#${filterId})` }}>
          <button
            type="button"
            className="pointer-events-auto absolute right-0 bottom-0 grid h-14 w-14 place-items-center rounded-full bg-[#163300] text-white"
            aria-expanded={open}
            aria-label={open ? closeLabel : openLabel}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="relative grid h-6 w-6 place-items-center">
              <Menu
                size={22}
                strokeWidth={1.6}
                className={`absolute transition duration-200 ${open ? "scale-0 rotate-90 opacity-0" : "scale-100 opacity-100"}`}
              />
              <X
                size={22}
                strokeWidth={1.6}
                className={`absolute transition duration-200 ${open ? "scale-100 opacity-100" : "scale-0 -rotate-90 opacity-0"}`}
              />
            </span>
          </button>
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={item.current ? "page" : undefined}
              className={`absolute right-0 bottom-0 grid h-14 w-14 place-items-center rounded-full bg-[#163300] text-white ${open ? "pointer-events-auto" : "pointer-events-none"}`}
              style={{ zIndex: 10 - index }}
              initial={false}
              animate={{
                y: open ? -((index + 1) * STEP) : 0,
                scale: open ? 1 : 0.15,
              }}
              transition={{ ...spring, delay: open && !reduce ? index * 0.025 : 0 }}
              tabIndex={open ? 0 : -1}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
            >
              {item.icon}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
