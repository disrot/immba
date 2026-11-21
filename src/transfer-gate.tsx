import { createRoot, type Root } from "react-dom/client";
import CurrencyTransfer, {
  type CurrencyTransferProps,
} from "@/components/kokonutui/currency-transfer";
import "./kokonut.css?v=transfer1";

export type TransferView = {
  update: (props: CurrencyTransferProps) => void;
  unmount: () => void;
};

export const mountTransfer = (
  host: HTMLElement,
  props: CurrencyTransferProps
): TransferView => {
  const root: Root = createRoot(host);
  const update = (next: CurrencyTransferProps) => {
    root.render(<CurrencyTransfer {...next} />);
  };
  update(props);
  return {
    update,
    unmount: () => root.unmount(),
  };
};
