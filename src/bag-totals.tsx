import { createRoot, type Root } from "react-dom/client";
import { RollingNumber } from "@/components/kokonutui/rolling-number";
import "./kokonut.css?v=kit2";

export type TotalRow = {
  id: string;
  label: string;
  amount: number;
  strong?: boolean;
};

const figure = (amount: number, locale: string) =>
  `NT$${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount)}`;

export function BagTotals({
  rows,
  locale,
}: {
  rows: TotalRow[];
  locale: string;
}) {
  return (
    <div className="bag-fees">
      {rows.map((row) => {
        const text = figure(row.amount, locale);
        return (
          <p className={row.strong ? "trade-total" : undefined} key={row.id}>
            <span>{row.label}</span>
            <span className="trade-money">
              <span className="sr-only">{text}</span>
              <RollingNumber value={text} />
            </span>
          </p>
        );
      })}
    </div>
  );
}

export type TotalsView = {
  update: (rows: TotalRow[], locale: string) => void;
  unmount: () => void;
};

export const mountTotals = (
  host: HTMLElement,
  rows: TotalRow[],
  locale: string
): TotalsView => {
  const root: Root = createRoot(host);
  const draw = (next: TotalRow[], nextLocale: string) => {
    root.render(<BagTotals locale={nextLocale} rows={next} />);
  };
  draw(rows, locale);
  return {
    update: draw,
    unmount: () => root.unmount(),
  };
};
