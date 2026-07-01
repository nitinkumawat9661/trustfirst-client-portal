import type { PlatformReference, PlatformServiceContext } from "./common";

export type TemplateKind =
  | "requirement"
  | "notification"
  | "workflow"
  | "form"
  | "document";

export type TemplateDescriptor = {
  id: string;
  kind: TemplateKind;
  name: string;
  target?: PlatformReference;
  version: number;
};

export type TemplateRenderInput = {
  data: Record<string, unknown>;
  templateId: string;
};

export interface TemplateService {
  describeTemplate(
    context: PlatformServiceContext,
    templateId: string,
  ): Promise<TemplateDescriptor | null>;
  render(
    context: PlatformServiceContext,
    input: TemplateRenderInput,
  ): Promise<{ output: string }>;
}
