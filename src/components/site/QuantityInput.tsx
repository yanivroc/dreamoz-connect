import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuantityInput({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  className,
}: {
  value: number;
  onChange: (qty: number) => void;
  min?: number;
  max?: number;
  label: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        const raw = Number(e.target.value);
        if (!Number.isFinite(raw)) return onChange(min);
        if (raw > max) {
          toast.info(`Only ${max} available`);
          return onChange(max);
        }
        onChange(Math.max(raw || min, min));
      }}
      aria-label={label}
      className={cn(
        "h-10 w-20 rounded-md border border-input bg-background px-3 text-sm text-foreground",
        className,
      )}
    />
  );
}
