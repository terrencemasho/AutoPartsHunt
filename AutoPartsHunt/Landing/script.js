function toggleMenu() {
  const nav = document.querySelector('.link');
  const btn = document.querySelector('.hamburger');
  const isOpen = nav.classList.contains('active');
  if (isOpen) {
    nav.classList.remove('active');
    btn.textContent = '☰';
  } else {
    nav.classList.add('active');
    btn.textContent = '✕';
  }
}

// Close nav when clicking anywhere outside header
document.addEventListener('click', function(e) {
  const nav = document.querySelector('.link');
  const btn = document.querySelector('.hamburger');
  if (nav.classList.contains('active') && !e.target.closest('header')) {
    nav.classList.remove('active');
    btn.textContent = '☰';
  }
});
