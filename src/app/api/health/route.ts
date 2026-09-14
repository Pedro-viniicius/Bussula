export const dynamic = "force-dynamic";

// Liveness only: no DB round-trip, so a database incident does not take
// the health check down with it (uptime monitors would otherwise page twice).
export function GET() {
  return Response.json({ status: "ok", time: new Date().toISOString() });
}
