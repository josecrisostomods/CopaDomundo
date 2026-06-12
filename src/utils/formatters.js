import { methodOptions } from "../config/appConfig";

export function formatDate(dateString) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function formatTime(dateString) {
  if (!dateString) return "Pendente";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

export function statusLabel(status) {
  const labels = {
    SCHEDULED: "Aberto",
    LIVE: "Ao vivo",
    FINISHED: "Finalizado",
    POSTPONED: "Adiado",
    CANCELLED: "Cancelado",
  };

  return labels[status] || status;
}

export function outcomeLabel(outcome, fixture) {
  const labels = {
    HOME: fixture?.home?.name || "Time A",
    DRAW: "Empate",
    AWAY: fixture?.away?.name || "Time B",
  };

  return labels[outcome] || "Sem palpite";
}

export function methodLabel(method) {
  return methodOptions.find((item) => item.id === method)?.label || "A definir";
}
