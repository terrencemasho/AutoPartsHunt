function toggleMenu() {
  const nav = document.querySelector('.link');
  nav.classList.toggle('active');
}

function trackOrder() {
  const input = document.getElementById('orderInput').value.trim();
  if (!input) {
    alert('Please enter an Order ID or Phone Number.');
    return;
  }
  const panel = document.getElementById('resultPanel');
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Also trigger on Enter key
document.getElementById('orderInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') trackOrder();
});
