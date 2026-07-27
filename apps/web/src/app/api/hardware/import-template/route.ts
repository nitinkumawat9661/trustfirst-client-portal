import { NextResponse } from "next/server";
import { hardwareProductImportTemplateCsv } from "@/server/hardware";

export async function GET() {
  return new NextResponse(hardwareProductImportTemplateCsv(), {
    headers: {
      "content-disposition": "attachment; filename=\"mangalam-product-import-template.csv\"",
      "content-type": "text/csv; charset=utf-8",
    },
  });
}
