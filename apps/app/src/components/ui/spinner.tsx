import { cn } from "@/lib/utils";
import { RiLoader2Line } from "@remixicon/react";

function Spinner({ className, children, ...props }: React.ComponentProps<"svg">) {
  return (
    <RiLoader2Line
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
