import { createRoot, type Root } from "react-dom/client";
import FileUpload, {
  type FileUploadProps,
} from "@/components/kokonutui/file-upload";
import "./kokonut.css?v=kit2";

export type FileUploadView = { unmount: () => void };

export const mountFileUpload = (
  host: HTMLElement,
  props: FileUploadProps
): FileUploadView => {
  const root: Root = createRoot(host);
  root.render(<FileUpload className="max-w-none" {...props} />);
  return { unmount: () => root.unmount() };
};
