import { z } from "zod";

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;

export type CursorPage<TItem> = {
  items: TItem[];
  pageInfo: {
    endCursor: string | null;
    hasNextPage: boolean;
  };
};

export function encodeCursor(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string) {
  return Buffer.from(cursor, "base64url").toString("utf8");
}
