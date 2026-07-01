import type { NextRequest } from "next/server";
import type { z } from "zod";
import { AppError } from "../domain/errors";

export type RequestValidationSchemas = {
  body?: z.ZodType;
  query?: z.ZodType;
};

export type ValidatedRequest<TBody = unknown, TQuery = unknown> = {
  body?: TBody;
  query?: TQuery;
};

export async function validateRequest<TBody = unknown, TQuery = unknown>(
  request: NextRequest,
  schemas: RequestValidationSchemas,
): Promise<ValidatedRequest<TBody, TQuery>> {
  const output: ValidatedRequest<TBody, TQuery> = {};

  if (schemas.query) {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = schemas.query.safeParse(query);

    if (!parsed.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
        message: "Query parameters are invalid.",
        status: 422,
      });
    }

    output.query = parsed.data as TQuery;
  }

  if (schemas.body) {
    const body = await readJsonBody(request);
    const parsed = schemas.body.safeParse(body);

    if (!parsed.success) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        details: parsed.error.flatten(),
        message: "Request body is invalid.",
        status: 422,
      });
    }

    output.body = parsed.data as TBody;
  }

  return output;
}

async function readJsonBody(request: NextRequest) {
  if (!request.body) {
    return {};
  }

  try {
    return await request.json();
  } catch {
    throw new AppError({
      code: "BAD_REQUEST",
      message: "Request body must be valid JSON.",
      status: 400,
    });
  }
}
