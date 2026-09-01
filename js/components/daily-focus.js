export function createDailyFocusCard(item) {
  const button = document.createElement("button");
  button.className = "daily-focus";
  button.type = "button";
  button.setAttribute("aria-label", `Open Daily Focus: ${item.name}`);

  button.innerHTML = `
    <div class="daily-focus__content">
      <p class="daily-focus__label">${escapeHtml(item.label)}</p>
      <p class="daily-focus__brand">${escapeHtml(item.brand)}</p>
      <h2 class="daily-focus__title">${escapeHtml(item.name)}</h2>
      <p class="daily-focus__summary">${escapeHtml(item.summary)}</p>
      <div class="daily-focus__footer">
        <span>${escapeHtml(item.time)}</span>
        <span class="circle-arrow" aria-hidden="true">→</span>
      </div>
    </div>
  `;

  return button;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
