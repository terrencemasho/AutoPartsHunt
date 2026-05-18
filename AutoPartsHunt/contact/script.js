function toggleMenu() {
  document.querySelector('.link').classList.toggle('active');
}

let tt;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerHTML = msg;
  toast.classList.add('show');
  clearTimeout(tt);
  tt = setTimeout(() => toast.classList.remove('show'), 3500);
}

async function sendMsg() {
  const name    = document.getElementById('c-name').value.trim();
  const phone   = document.getElementById('c-phone').value.trim();
  const email   = document.getElementById('c-email').value.trim();
  const subject = document.getElementById('c-subject').value;
  const msg     = document.getElementById('c-msg').value.trim();

  if (!name)    { highlight('c-name');    showToast('⚠️ Please enter your name'); return; }
  if (!subject) { highlight('c-subject'); showToast('⚠️ Please select a subject'); return; }
  if (!msg)     { highlight('c-msg');     showToast('⚠️ Please write a message'); return; }

  const btn = document.querySelector('.send-btn');
  btn.textContent   = '⏳ Sending...';
  btn.style.opacity = '0.7';
  btn.disabled      = true;

  const sent = await window.Notify.sendContactMessage({
    fromName:  name,
    fromEmail: email,
    fromPhone: phone,
    subject,
    message:   msg
  });

  if (sent) {
    btn.textContent      = '✓ Message Sent!';
    btn.style.background = '#16a34a';
    btn.style.opacity    = '1';
    showToast("✅ Message sent! We'll get back to you soon.");
    ['c-name','c-phone','c-email','c-msg'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('c-subject').value = '';
    setTimeout(() => { btn.textContent = 'Send Message →'; btn.style.background = ''; btn.disabled = false; }, 3000);
  } else {
    btn.textContent   = 'Send Message →';
    btn.style.opacity = '1';
    btn.disabled      = false;
    showToast('❌ Failed to send. Please email us directly at autopartshuntcontact@gmail.com');
  }
}

function highlight(id) {
  const el = document.getElementById(id);
  el.style.borderColor = '#E84800';
  el.style.animation   = 'shk 0.35s ease';
  setTimeout(() => { el.style.borderColor = ''; el.style.animation = ''; }, 900);
}

const ks = document.createElement('style');
ks.textContent = `@keyframes shk{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`;
document.head.appendChild(ks);
