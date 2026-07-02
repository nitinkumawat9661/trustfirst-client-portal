import { Badge } from "@trustfirst/ui";
import { BillingBarcodeSearch } from "@/components/hardware/hardware-demo-panels";
import { HardwareTradeFormShell } from "@/components/hardware/hardware-trade-panels";

export default function NewHardwareSalePage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>New sale</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Create hardware sale</h1>
      </div>
      <BillingBarcodeSearch />
      <HardwareTradeFormShell mode="sale" />
    </div>
  );
}
