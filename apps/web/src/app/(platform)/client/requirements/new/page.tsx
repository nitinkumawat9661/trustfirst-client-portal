import { AppShell } from "@/components/shell/app-shell";
import { RequirementWizard } from "@/features/requirements/requirement-wizard";

export default function NewRequirementPage() {
  return (
    <AppShell mode="client">
      <RequirementWizard />
    </AppShell>
  );
}
