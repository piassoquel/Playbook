let timeoutId;

export function showToast(message) {
  const toast = document.querySelector("#toast");

  if (!toast) return;

  window.clearTimeout(timeoutId);
  toast.textContent = message;
  toast.classList.add("toast--visible");

  timeoutId = window.setTimeout(() => {
    toast.classList.remove("toast--visible");
  }, 2400);
}
