import { Badge } from "@trustfirst/ui";
import { HardwarePluginSummary } from "@/components/hardware/hardware-panels";
import { hardwareErpPluginManifest, hardwareServiceLine } from "@/server/hardware";

export default function HardwarePluginPage() {
  return (
    <div className="space-y-6">
      <div>
        <Badge>Plugin</Badge>
        <h1 className="mt-4 text-3xl font-semibold">{hardwareErpPluginManifest.name}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{hardwareServiceLine.description}</p>
      </div>
      <HardwarePluginSummary />
    </div>
  );
}
