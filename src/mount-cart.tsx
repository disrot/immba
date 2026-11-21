import { createRoot, type Root } from "react-dom/client";
import { BookOpen } from "lucide-react";
import CartButton, {
  type CartButtonProps,
  type CartItem,
} from "@/components/kokonutui/cart-button";
import "./kokonut.css?v=kit2";

export type CartLine = {
  id: string;
  name: string;
  detail: string;
  price: number;
  image?: string;
  max?: number;
};

export type CartMountProps = Omit<CartButtonProps, "items"> & {
  lines: CartLine[];
};

export type CartView = {
  update: (props: CartMountProps) => void;
  unmount: () => void;
};

export const mountCart = (
  host: HTMLElement,
  props: CartMountProps
): CartView => {
  const root: Root = createRoot(host);
  const draw = ({ lines, ...rest }: CartMountProps) => {
    const items: CartItem[] = lines.map((line) => ({
      id: line.id,
      name: line.name,
      detail: line.detail,
      price: line.price,
      image: line.image,
      max: line.max,
      icon: BookOpen,
      tint: "bg-zinc-100 text-zinc-700",
    }));
    root.render(<CartButton className="max-w-none" items={items} {...rest} />);
  };
  draw(props);
  return {
    update: draw,
    unmount: () => root.unmount(),
  };
};
