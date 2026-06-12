export async function syncFixtures(provider = "api-football") {
  const response = await fetch(`/api/sync-fixtures?provider=${encodeURIComponent(provider)}`);
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("A rota de API nao esta ativa neste ambiente. No deploy da Vercel ela atualiza automaticamente.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Nao foi possivel sincronizar a API.");
  }

  return payload;
}
