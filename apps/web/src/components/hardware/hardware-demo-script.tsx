import { Badge, Card, CardContent, CardHeader, CardTitle } from "@trustfirst/ui";
import { CheckCircle2, FileSpreadsheet, MapPinned, PackageCheck, Route } from "lucide-react";
import Image from "next/image";

type ImportTemplateColumn = {
  key: string;
  label: string;
  required: boolean;
  example: string;
  notes: string;
};

type DemoScriptStep = {
  key: string;
  title: string;
  route: string;
  outcome: string;
};

type RequirementMappingRow = {
  requirement: string;
  implementedModule: string;
  status: "ready" | "partial" | "future";
  demoRoute: string;
  note: string;
};

type DemoAcceptanceItem = {
  key: string;
  label: string;
  evidence: string;
  limitation?: string;
};

type HardwareClientConfiguration = {
  addressDisplay: string;
  businessType: string;
  defaultFinancialYear: string;
  defaultGstMode: string;
  defaultRoundOff: boolean;
  defaultStockLocation: { code: string; name: string };
  firmName: string;
  gstin: string;
  identityStatus: string;
  invoicePrefix: string;
  legalName: string;
  logoUrl: string;
  proprietorName: string;
  quotationPrefix: string;
  tagline: string;
  tenantSlug: string;
  termsFooter: string;
};

type HardwareDemoScriptProps = {
  acceptanceItems: readonly DemoAcceptanceItem[];
  configuration: HardwareClientConfiguration;
  importColumns: readonly ImportTemplateColumn[];
  requirementMapping: readonly RequirementMappingRow[];
  scriptSteps: readonly DemoScriptStep[];
};

export function HardwareDemoScript({
  acceptanceItems,
  configuration,
  importColumns,
  requirementMapping,
  scriptSteps,
}: HardwareDemoScriptProps) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <Image
              alt={`${configuration.firmName} approved logo`}
              className="mb-3 size-24 object-contain"
              height={96}
              src={configuration.logoUrl}
              unoptimized
              width={96}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Configuration pack</Badge>
              <Badge>{configuration.businessType}</Badge>
            </div>
            <CardTitle className="text-2xl">{configuration.firmName}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Readout label="Tenant slug" value={configuration.tenantSlug} />
            <Readout label="Identity status" value={configuration.identityStatus} />
            <Readout label="Legal name" value={configuration.legalName} />
            <Readout label="Proprietor" value={configuration.proprietorName} />
            <Readout label="GSTIN" value={configuration.gstin} />
            <Readout label="Official address" value={configuration.addressDisplay} />
            <Readout label="Tagline" value={configuration.tagline} />
            <Readout label="Financial year" value={configuration.defaultFinancialYear} />
            <Readout label="GST mode" value={configuration.defaultGstMode} />
            <Readout label="Round-off" value={configuration.defaultRoundOff ? "Enabled" : "Disabled"} />
            <Readout label="Invoice prefix" value={configuration.invoicePrefix} />
            <Readout label="Quotation prefix" value={configuration.quotationPrefix} />
            <Readout label="Terms/footer" value={configuration.termsFooter} />
            <Readout
              label="Default stock"
              value={`${configuration.defaultStockLocation.name} (${configuration.defaultStockLocation.code})`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="size-5 text-muted-foreground" />
              <CardTitle>Acceptance checklist</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {acceptanceItems.map((item) => (
              <div className="rounded-md border border-border p-3" key={item.key}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{item.label}</p>
                  <Badge>ready</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.evidence}</p>
                {item.limitation ? <p className="mt-2 text-xs text-muted-foreground">{item.limitation}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Route aria-hidden className="size-5 text-muted-foreground" />
            <CardTitle>Demo walkthrough</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {scriptSteps.map((step, index) => (
            <article className="rounded-md border border-border p-4" key={step.key}>
              <Badge>Step {index + 1}</Badge>
              <h2 className="mt-3 text-base font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.outcome}</p>
              <p className="mt-3 font-mono text-xs text-muted-foreground">{step.route}</p>
            </article>
          ))}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileSpreadsheet aria-hidden className="size-5 text-muted-foreground" />
              <CardTitle>Import template contract</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Column</th>
                  <th className="py-2 pr-3">Required</th>
                  <th className="py-2 pr-3">Example</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {importColumns.map((column) => (
                  <tr className="border-b border-border last:border-b-0" key={column.key}>
                    <td className="py-3 pr-3 font-medium">{column.label}</td>
                    <td className="py-3 pr-3">{column.required ? "Yes" : "No"}</td>
                    <td className="py-3 pr-3 font-mono text-xs">{column.example}</td>
                    <td className="py-3 text-muted-foreground">{column.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPinned aria-hidden className="size-5 text-muted-foreground" />
              <CardTitle>Requirement mapping</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {requirementMapping.map((row) => (
              <div className="rounded-md border border-border p-3" key={row.requirement}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{row.requirement}</p>
                  <Badge>{row.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{row.implementedModule}</p>
                <p className="mt-2 text-xs text-muted-foreground">{row.note}</p>
                <p className="mt-3 font-mono text-xs text-muted-foreground">{row.demoRoute}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PackageCheck aria-hidden className="size-5 text-muted-foreground" />
            <CardTitle>Seed profile scope</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-md border border-border p-3">Generic hardware and sanitary sample data only.</div>
          <div className="rounded-md border border-border p-3">No live payment gateways or confidential customer data.</div>
          <div className="rounded-md border border-border p-3">Tenant-scoped seed and reset commands keep demo data isolated.</div>
        </CardContent>
      </Card>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}
