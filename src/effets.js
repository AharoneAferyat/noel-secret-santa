// Pluie de sapins sur tout l'écran (quand le nom du Secret Santa est dévoilé).
const SAPIN = (couleur, etoile) => `
<svg viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <polygon points="20,4 33,20 26,20 37,34 28,34 40,46 0,46 12,34 3,34 14,20 7,20" fill="${couleur}"/>
  <rect x="16.5" y="46" width="7" height="6" rx="1" fill="#7a4a24"/>
  <circle cx="14" cy="30" r="2" fill="#d7263d"/>
  <circle cx="25" cy="38" r="2" fill="#f2c14e"/>
  <circle cx="22" cy="22" r="1.8" fill="#ffffff"/>
  <polygon points="20,0 21.6,3.6 25.4,3.8 22.4,6.2 23.4,9.8 20,7.8 16.6,9.8 17.6,6.2 14.6,3.8 18.4,3.6" fill="${etoile}"/>
</svg>`;

const VERTS = ['#1f6b40', '#2e8b57', '#18563a', '#3a9d63'];

export function pluieDeSapins(nombre = 45) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const calque = document.createElement('div');
  calque.className = 'pluie-sapins';
  calque.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < nombre; i++) {
    const s = document.createElement('div');
    s.className = 'sapin-tombe';
    const taille = 22 + Math.random() * 30;
    const duree = 2.6 + Math.random() * 2.4;
    s.style.left = Math.random() * 100 + 'vw';
    s.style.width = taille + 'px';
    s.style.animationDuration = duree + 's';
    s.style.animationDelay = Math.random() * 1.4 + 's';
    s.style.setProperty('--derive', (Math.random() - 0.5) * 160 + 'px');
    s.style.setProperty('--rotation', (Math.random() - 0.5) * 720 + 'deg');
    s.innerHTML = SAPIN(VERTS[i % VERTS.length], Math.random() > 0.3 ? '#f2c14e' : '#ffffff');
    calque.appendChild(s);
  }

  document.body.appendChild(calque);
  setTimeout(() => calque.remove(), 6500);
}
