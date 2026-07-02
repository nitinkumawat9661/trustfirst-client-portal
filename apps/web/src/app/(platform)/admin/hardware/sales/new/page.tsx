import { Badge } from "@trustfirst/ui";
import { HardwareTradeFormShell } from "@/components/hardware/hardware-trade-panels";

export default function NewHardwareSalePage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>New sale</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Create hardware sale</h1>
      </div>
      <HardwareTradeFormShell mode="sale" />
    </div>
  );
}
