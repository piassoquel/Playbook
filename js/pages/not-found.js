export function renderNotFoundPage(container) {
  container.innerHTML = `
    <section class="section-heading">
      <p class="eyebrow">Page not found</p>
      <h1 class="page-title">That section is not ready yet.</h1>
      <p class="page-description">
        Return home and choose another section.
      </p>
    </section>

    <a class="back-button" href="#/">
      <span aria-hidden="true">←</span>
      <span>Back to Home</span>
    </a>
  `;
}
