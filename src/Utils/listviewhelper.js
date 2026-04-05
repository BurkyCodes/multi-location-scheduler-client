export const getEventColor = (type = "") => {
  const normalized = String(type).toLowerCase();

  if (normalized.includes("meeting")) {
    return { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" };
  }
  if (normalized.includes("call")) {
    return { bg: "#dcfce7", text: "#15803d", border: "#86efac" };
  }
  if (normalized.includes("task")) {
    return { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" };
  }
  if (normalized.includes("follow")) {
    return { bg: "#f3e8ff", text: "#7e22ce", border: "#d8b4fe" };
  }

  return { bg: "#e2e8f0", text: "#334155", border: "#cbd5e1" };
};

export const getAssigneeShortName = (event) => {
  const name =
    event?.ownerUserId?.name ||
    event?.ownerUserId?.username ||
    event?.ownerUserId?.email ||
    "";

  if (!name) return "";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 12);
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

