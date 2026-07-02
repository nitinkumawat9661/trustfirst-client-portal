import { Badge } from "@trustfirst/ui";
import { BarcodeProductForm, HardwareLanguageSwitcherContract } from "@/components/hardware/hardware-demo-panels";

export default function NewHardwareProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Catalog</Badge>
        <h1 className="mt-4 text-3xl font-semibold">Product entry</h1>
      </div>
      <BarcodeProductForm />
      <HardwareLanguageSwitcherContract />
    </div>
  );
}
