import { Badge } from "@trustfirst/ui";
import { HardwareTradeFormShell } from "@/components/hardware/hardware-trade-panels";

export default function NewHardwarePurchasePage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>New purchase</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Create hardware purchase</h1>
      </div>
      <HardwareTradeFormShell mode="purchase" />
    </div>
  );
}
