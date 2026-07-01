import type { BusinessExecutionContext } from "./common";

export type NumberSequenceCode = "REQ" | "INV" | "QUO" | "PRJ" | string;

export type NumberSequencePattern = {
  code: NumberSequenceCode;
  example: string;
  padding: number;
  resetStrategy: "never" | "yearly" | "monthly";
  separator: string;
};

export type NumberGenerationRequest = {
  code: NumberSequenceCode;
  date: Date;
  entityType: string;
};

export type NumberReservation = {
  displayNumber: string;
  pattern: NumberSequencePattern;
  sequenceValue: number;
};

export interface UniversalNumberGenerator {
  describePattern(
    context: BusinessExecutionContext,
    code: NumberSequenceCode,
  ): Promise<NumberSequencePattern | null>;
  preview(
    context: BusinessExecutionContext,
    request: NumberGenerationRequest,
  ): Promise<NumberReservation>;
  reserve(
    context: BusinessExecutionContext,
    request: NumberGenerationRequest,
  ): Promise<NumberReservation>;
}

export type UniversalNumberPatternExample =
  | "REQ-2026-0001"
  | "INV-2026-0001"
  | "QUO-2026-0001"
  | "PRJ-2026-0001";
