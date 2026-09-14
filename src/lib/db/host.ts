/**
 * Hostname of a connection string, for logs and scripts. Never the
 * credentials: the URL is parsed and only `hostname` comes back.
 */
export function hostDoBanco(connectionString: string): string {
  try {
    return new URL(connectionString).hostname || "(host desconhecido)";
  } catch {
    return "(url inválida)";
  }
}
