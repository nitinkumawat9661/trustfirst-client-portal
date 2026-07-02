import type { CommercialValidationResult } from "./common";
import type { AutomationDefinition } from "./automation-engine";
import type { FormBuilderTemplate } from "./form-builder";
import type { PluginManifest } from "./plugin-system";
import type { CommercialWorkflowDefinition } from "./workflow-engine";

export class CommercialPlatformService {
  validateWorkflow(definition: CommercialWorkflowDefinition): CommercialValidationResult {
    const nodeIds = new Set(definition.nodes.map((node) => node.id));
    const issues = definition.edges
      .flatMap((edge) => [
        !nodeIds.has(edge.from)
          ? { code: "UNKNOWN_FROM_NODE", message: `Unknown from node ${edge.from}` }
          : null,
        !nodeIds.has(edge.to)
          ? { code: "UNKNOWN_TO_NODE", message: `Unknown to node ${edge.to}` }
          : null,
      ])
      .filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));

    return { issues, valid: issues.length === 0 };
  }

  validateAutomation(definition: AutomationDefinition): CommercialValidationResult {
    const issues = [
      definition.actions.length === 0
        ? { code: "NO_ACTIONS", message: "Automation requires at least one action." }
        : null,
      !definition.trigger.eventName
        ? { code: "NO_TRIGGER", message: "Automation requires a trigger event." }
        : null,
    ].filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));

    return { issues, valid: issues.length === 0 };
  }

  validateFormTemplate(template: FormBuilderTemplate): CommercialValidationResult {
    const fieldKeys = template.sections.flatMap((section) =>
      section.fields.map((field) => field.key),
    );
    const duplicates = fieldKeys.filter((key, index) => fieldKeys.indexOf(key) !== index);
    const issues = [...new Set(duplicates)].map((key) => ({
      code: "DUPLICATE_FIELD",
      message: `Duplicate field key ${key}`,
    }));

    return { issues, valid: issues.length === 0 };
  }

  validatePluginManifest(manifest: PluginManifest): CommercialValidationResult {
    const issues = [
      manifest.capabilities.length === 0
        ? { code: "NO_CAPABILITIES", message: "Plugin must expose at least one capability." }
        : null,
      !manifest.version
        ? { code: "NO_VERSION", message: "Plugin version is required." }
        : null,
    ].filter((issue): issue is NonNullable<typeof issue> => Boolean(issue));

    return { issues, valid: issues.length === 0 };
  }
}
