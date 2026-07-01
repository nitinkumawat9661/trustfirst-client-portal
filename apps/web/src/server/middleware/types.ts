import type { NextResponse } from "next/server";
import type { ApiContext } from "../api/context";

export type ApiRouteHandler = (context: ApiContext) => Promise<NextResponse>;

export type ApiMiddleware = (
  context: ApiContext,
  next: ApiRouteHandler,
) => Promise<NextResponse>;
