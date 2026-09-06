import { IconButton } from "@/components/icon-button";
import { IconClose } from "@/components/ui-icons";

export function DialogCloseButton({
  onClick,
  size = "sm",
}: {
  onClick: () => void;
  size?: "sm" | "md";
}) {
  return (
    <IconButton label="關閉" size={size} onClick={onClick}>
      <IconClose />
    </IconButton>
  );
}
