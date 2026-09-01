export function createSportCard(sport) {
  const link = document.createElement("a");
  link.className = "sport-card";
  link.href = `#/sport/${sport.id}`;
  link.setAttribute("aria-label", `Open ${sport.name}`);

  link.innerHTML = `
    <img
      class="sport-card__image"
      src="${escapeHtml(sport.image)}"
      alt=""
      loading="eager"
    >
    <div class="sport-card__content">
      <h2 class="sport-card__title">${escapeHtml(sport.name)}</h2>
      <div class="sport-card__footer">
        <p class="sport-card__description">${escapeHtml(sport.description)}</p>
        <span class="circle-arrow" aria-hidden="true">→</span>
      </div>
    </div>
  `;

  return link;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
