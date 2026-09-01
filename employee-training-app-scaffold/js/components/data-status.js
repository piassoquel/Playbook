export function renderDataStatus(appData) {
  const existing = document.querySelector("[data-data-status]");

  if (existing) {
    existing.remove();
  }

  if (!appData?.warning) {
    return;
  }

  const banner = document.createElement("div");
  banner.className = "data-status-banner";
  banner.dataset.dataStatus = "true";
  banner.setAttribute("role", "status");

  banner.innerHTML = `
    <strong>Limited data mode</strong>
    <span>${escapeHtml(appData.warning)}</span>
  `;

  document.body.prepend(banner);
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
