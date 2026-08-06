export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const archiveUrl =
  "https://codeload.github.com/nitinkumawat9661/trustfirst-client-portal/zip/refs/heads/fix/post-bill-payment-accounting";

export async function GET() {
  const response = await fetch(archiveUrl, { cache: "no-store" });
  if (!response.ok || !response.body) {
    return Response.json(
      { error: `Branch archive fetch failed with ${response.status}.` },
      { status: 502 },
    );
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="trustfirst-client-portal-payment-flow.zip"',
      "Content-Type": "application/zip",
    },
  });
}
