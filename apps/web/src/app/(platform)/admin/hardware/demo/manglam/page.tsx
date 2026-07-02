import { Badge } from "@trustfirst/ui";
import { HardwareDemoScript } from "@/components/hardware/hardware-demo-script";
import {
  manglamAcceptanceChecklist,
  manglamDemoScript,
  manglamImportTemplateContract,
  manglamRequirementMapping,
  manglamTradingConfiguration,
} from "@/server/config-packs/manglam-profile";

export const dynamic = "force-dynamic";

export default function HardwareClientDemoScriptPage() {
  return (
    <div className="space-y-6">
      <header>
        <Badge>Client demo script</Badge>
        <h1 className="mt-4 text-3xl font-semibold">{manglamTradingConfiguration.firmName} demo pack</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Configuration-only demo pack for the hardware and sanitary workflow. Firm-specific values are read from the
          tenant configuration profile and can be replaced without changing platform components or services.
        </p>
      </header>
      <HardwareDemoScript
        acceptanceItems={manglamAcceptanceChecklist}
        configuration={manglamTradingConfiguration}
        importColumns={manglamImportTemplateContract}
        requirementMapping={manglamRequirementMapping}
        scriptSteps={manglamDemoScript}
      />
    </div>
  );
}
