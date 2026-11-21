const EASE_OUT_CSS = "cubic-bezier(0.23, 1, 0.32, 1)";
const DIGIT_STAGGER_MS = 30;
const DIGIT_ROLL_MS = 550;

/**
 * An odometer: each digit is a 0-9 strip in a one-digit window, moved with
 * translateY. Columns are keyed from the right so a changing length keeps
 * them aligned, and the right-most column moves first.
 */
export function RollingNumber({ value }: { value: string }) {
  const chars = Array.from(value);
  return (
    <span aria-hidden="true" className="inline-flex select-none tabular-nums">
      {chars.map((char, index) => {
        const fromRight = chars.length - index;
        const digit = Number.parseInt(char, 10);
        if (Number.isNaN(digit)) {
          return <span key={`s-${fromRight}`}>{char}</span>;
        }
        return (
          <span
            className="relative inline-block h-[1lh] overflow-hidden"
            key={`d-${fromRight}`}
          >
            <span className="invisible">0</span>
            <span
              className="absolute inset-x-0 top-0 flex flex-col motion-reduce:transition-none!"
              style={{
                transform: `translateY(${-digit * 10}%)`,
                transition: `transform ${DIGIT_ROLL_MS}ms ${EASE_OUT_CSS} ${(fromRight - 1) * DIGIT_STAGGER_MS}ms`,
              }}
            >
              {"0123456789".split("").map((n) => (
                <span className="h-[1lh]" key={n}>
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
