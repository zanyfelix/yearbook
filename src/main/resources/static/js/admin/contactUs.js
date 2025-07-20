function toggleAll(source) {
  document.querySelectorAll('.selectBox')
          .forEach(cb => cb.checked = source.checked);
}

document.addEventListener('DOMContentLoaded', () => {
  const contactModal = document.getElementById('contactModal');
  contactModal.addEventListener('show.bs.modal', e => {
    const btn = e.relatedTarget;
    document.getElementById('modalUser').textContent      = btn.dataset.user;
    document.getElementById('modalEmail').textContent     = btn.dataset.email;
    document.getElementById('modalSubject').textContent   = btn.dataset.subject;
    document.getElementById('modalMessage').textContent   = btn.dataset.message;
  });
});