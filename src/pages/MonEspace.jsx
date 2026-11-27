import { useEffect, useRef, useState } from 'react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { PARTICIPATIONS } from '../config.js';
import { fmtDate, hashPin, norm, participationDe } from '../utils.js';
import { ChoixDispos, ChoixParticipation, Pastilles } from '../components.jsx';
import { pluieDeSapins } from '../effets.js';

const lireSession = () => {
  try {
    return JSON.parse(localStorage.getItem('noel_session') || 'null');
  } catch {
    return null;
  }
};

export default function MonEspace({ settings, participants, charge }) {
  const [session, setSession] = useState(lireSession);
  const moi = session ? participants.find((p) => p.id === session.key) : null;
  const valide = moi && moi.pinHash === session.pinHash;

  useEffect(() => {
    // Inscription supprimée ou PIN changé par l'admin -> on déconnecte
    if (charge && session && !valide) {
      localStorage.removeItem('noel_session');
      setSession(null);
    }
  }, [charge, session, valide]);

  if (!session || !valide) {
    return (
      <Connexion
        participants={participants}
        charge={charge}
        onOk={(s) => {
          localStorage.setItem('noel_session', JSON.stringify(s));
          localStorage.setItem('noel_dernier', s.key);
          setSession(s);
        }}
      />
    );
  }

  const deconnexion = () => {
    localStorage.removeItem('noel_session');
    setSession(null);
  };

  return <Espace moi={moi} settings={settings} participants={participants} onDeconnexion={deconnexion} />;
}

function Connexion({ participants, charge, onOk }) {
  const [choisi, setChoisi] = useState(() => localStorage.getItem('noel_dernier') || '');
  const [recherche, setRecherche] = useState('');
  const [pin, setPin] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const personne = participants.find((p) => p.id === choisi);

  const verifier = async (code) => {
    if (!personne || code.length !== 4) return;
    setErreur('');
    setEnvoi(true);
    try {
      const pinHash = await hashPin(code, personne.id);
      if (personne.pinHash !== pinHash) {
        setErreur('Code incorrect. En cas d\u2019oubli, demande à l\u2019organisateur de le réinitialiser.');
        setPin('');
      } else onOk({ key: personne.id, pinHash });
    } finally {
      setEnvoi(false);
    }
  };

  // Étape 2 : profil choisi -> code
  if (personne) {
    return (
      <section className="bloc">
        <h1 className="titre-page">Mon espace</h1>
        <div className="profil-choisi">
          <div className="avatar grand">{initiales(personne)}</div>
          <div className="profil-nom">{personne.prenom} {personne.nom}</div>
          <div className="aide">{personne.titre}</div>
          <form
            className="formulaire pin-form"
            onSubmit={(e) => {
              e.preventDefault();
              verifier(pin);
            }}
          >
            <label>
              Ton code PIN
              <input
                className="pin"
                value={pin}
                autoFocus
                inputMode="numeric"
                type="password"
                autoComplete="current-password"
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(v);
                  if (v.length === 4) verifier(v);
                }}
              />
            </label>
            {erreur && <div className="alerte erreur">{erreur}</div>}
            <button className="btn rouge large" disabled={envoi || pin.length !== 4}>{envoi ? 'Connexion…' : 'Me connecter'}</button>
          </form>
          <button className="lien" onClick={() => { setChoisi(''); setPin(''); setErreur(''); }}>Ce n'est pas moi</button>
        </div>
      </section>
    );
  }

  // Étape 1 : choisir son profil
  const q = norm(recherche);
  const liste = participants.filter((p) => !q || norm(`${p.prenom} ${p.nom} ${p.titre}`).includes(q));

  return (
    <section className="bloc">
      <h1 className="titre-page">Mon espace</h1>
      <p>Clique sur ton nom, puis entre ton code.</p>
      {participants.length > 8 && (
        <input className="recherche" placeholder="Rechercher mon nom…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      )}
      {!charge && <p>Chargement…</p>}
      {charge && participants.length === 0 && <p className="aide">Personne n'est encore inscrit.</p>}
      <div className="profils">
        {liste.map((p) => (
          <button key={p.id} className="profil" onClick={() => setChoisi(p.id)}>
            <span className="avatar">{initiales(p)}</span>
            <span className="profil-texte">
              <strong>{p.prenom} {p.nom}</strong>
              <span>{p.titre}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="aide" style={{ marginTop: 16 }}>Pas encore inscrit·e ? <a href="#inscription">Inscris-toi ici</a>.</p>
    </section>
  );
}

const initiales = (p) => `${(p.prenom || '?')[0]}${(p.nom || '')[0] || ''}`.toUpperCase();

function Espace({ moi, settings, participants, onDeconnexion }) {
  const [titre, setTitre] = useState(moi.titre);
  const [participation, setParticipation] = useState(participationDe(moi));
  const [dispos, setDispos] = useState(moi.dispos || []);
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [devoile, setDevoile] = useState(false);

  const cible = moi.cible ? participants.find((p) => p.id === moi.cible) : null;
  const santaFige = settings.tirageFait && moi.santa; // déjà dans le tirage : ne peut plus en sortir

  const choix = PARTICIPATIONS.find((p) => p.id === participation);
  const options = santaFige ? 'fige' : settings.tirageFait ? 'bloque' : '';

  const enregistrer = async (e) => {
    e.preventDefault();
    setMessage('');
    setErreur('');
    if (!titre.trim()) return setErreur('Le poste ne peut pas être vide.');
    if (santaFige && !choix.santa) return setErreur('Le tirage a eu lieu : tu ne peux plus quitter le Secret Santa.');
    if (!moi.santa && choix.santa && settings.tirageFait) return setErreur('Le tirage a eu lieu : impossible de rejoindre le Secret Santa.');
    try {
      await updateDoc(doc(db, 'participants', moi.id), {
        titre: titre.trim(),
        repas: choix.repas,
        santa: choix.santa,
        dispos: choix.repas ? dispos : [],
      });
      setMessage('C’est enregistré !');
    } catch (err) {
      setErreur('Erreur : ' + err.message);
    }
  };

  const supprimer = async () => {
    if (santaFige) return setErreur("Le tirage a eu lieu : contacte l'organisateur pour te désinscrire.");
    if (!window.confirm('Supprimer définitivement ton inscription ?')) return;
    await deleteDoc(doc(db, 'participants', moi.id));
    onDeconnexion();
  };

  return (
    <section className="bloc">
      <div className="entete-espace">
        <div>
          <h1 className="titre-page">Bonjour {moi.prenom} !</h1>
          <p className="aide">{moi.prenom} {moi.nom} · {moi.titre} <Pastilles p={moi} /></p>
        </div>
        <button className="btn contour petit" onClick={onDeconnexion}>Déconnexion</button>
      </div>

      {moi.santa && (
        <div className="carte fond-rouge santa">
          <h2>Mon Secret Santa</h2>
          {!settings.tirageFait && <p>Le tirage au sort n'a pas encore eu lieu. Reviens ici {settings.dateTirage ? `à partir du ${fmtDate(settings.dateTirage)}` : 'après la clôture des inscriptions'} !</p>}
          {settings.tirageFait && cible && !moi.gratte && (
            <>
              <p>Gratte la carte pour découvrir à qui tu offres ton cadeau !</p>
              <Grattage onFini={() => setTimeout(() => { setDevoile(true); updateDoc(doc(db, 'participants', moi.id), { gratte: true }).catch(() => {}); }, 800)}>
                <Revelation cible={cible} budget={settings.budget} />
              </Grattage>
            </>
          )}
          {settings.tirageFait && cible && moi.gratte && !devoile && (
            <button className="btn blanc" onClick={() => setDevoile(true)}>Revoir à qui j'offre mon cadeau</button>
          )}
          {settings.tirageFait && cible && moi.gratte && devoile && (
            <div className="carte-grattage ouverte">
              <Revelation cible={cible} budget={settings.budget} />
            </div>
          )}
          {settings.tirageFait && !cible && <p>Tu n'as pas été inclus·e dans le tirage. Contacte l'organisateur.</p>}
        </div>
      )}

      <form onSubmit={enregistrer} className="formulaire">
        <h2 className="titre-section">Mon inscription</h2>
        <label>Poste<input value={titre} onChange={(e) => setTitre(e.target.value)} /></label>
        <fieldset>
          <legend>Je participe à…</legend>
          <ChoixParticipation valeur={participation} onChange={setParticipation} santaBloque={options === 'bloque' && !moi.santa} />
          {options === 'fige' && <p className="aide">Le tirage a eu lieu : tu restes dans le Secret Santa.</p>}
        </fieldset>
        {choix?.repas && (
          <fieldset>
            <legend>Mes disponibilités pour le repas</legend>
            <ChoixDispos settings={settings} dispos={dispos} onChange={setDispos} />
          </fieldset>
        )}
        {erreur && <div className="alerte erreur">{erreur}</div>}
        {message && <div className="alerte ok">{message}</div>}
        <button className="btn vert large">Enregistrer</button>
        <button type="button" className="lien-danger" onClick={supprimer}>Me désinscrire</button>
      </form>
    </section>
  );
}

export function Revelation({ cible, budget }) {
  return (
    <div className="revelation">
      <p>Tu offres un cadeau à…</p>
      <p className="nom-cible">{cible.prenom} {cible.nom}</p>
      <p className="titre-cible">{cible.titre}</p>
      {budget && <p>Budget : {budget} € maximum</p>}
      <p className="aide-claire">Chut… c'est un secret !</p>
    </div>
  );
}

// Carte à gratter façon ticket : couche argentée métallisée, bords irréguliers,
// paillettes qui tombent et légère vibration sur téléphone.
export function Grattage({ children, onFini }) {
  const boite = useRef(null);
  const toile = useRef(null);
  const toileMiettes = useRef(null);
  const [fini, setFini] = useState(false);
  const etat = useRef({ actif: false, dernier: null, compteur: 0, termine: false, miettes: [], anim: 0, vibre: 0 });

  useEffect(() => {
    const b = boite.current;
    const dpr = window.devicePixelRatio || 1;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    [toile.current, toileMiettes.current].forEach((c) => {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      c.getContext('2d').scale(dpr, dpr);
    });
    const ctx = toile.current.getContext('2d');

    // 1. Fond argenté métallisé
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#9ea3a8');
    g.addColorStop(0.25, '#d9dde0');
    g.addColorStop(0.45, '#aeb3b8');
    g.addColorStop(0.6, '#eef0f2');
    g.addColorStop(0.8, '#a4a9ae');
    g.addColorStop(1, '#c9cdd1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 2. Grain (bruit) pour l'effet feuille métallique
    const img = ctx.getImageData(0, 0, w * dpr, h * dpr);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 34;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);

    // 3. Motif répété en diagonale
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 9);
    ctx.font = '400 13px Anton, sans-serif';
    ctx.fillStyle = 'rgba(80, 86, 92, 0.16)';
    ctx.textAlign = 'center';
    for (let y = -h; y < h; y += 26) {
      for (let x = -w; x < w; x += 120) {
        ctx.fillText('SECRET SANTA ★', x + ((y / 26) % 2) * 60, y);
      }
    }
    ctx.restore();

    // 4. Reflet brillant
    const reflet = ctx.createLinearGradient(0, 0, w, 0);
    reflet.addColorStop(0.3, 'rgba(255,255,255,0)');
    reflet.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    reflet.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.fillStyle = reflet;
    ctx.fillRect(0, 0, w, h);

    // 5. Cadre en pointillés + texte
    ctx.strokeStyle = 'rgba(70, 75, 80, 0.45)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.setLineDash([]);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '400 34px Anton, sans-serif';
    ctx.fillText('GRATTE ICI', w / 2 + 1, h / 2 - 11);
    ctx.fillStyle = '#4a4f55';
    ctx.fillText('GRATTE ICI', w / 2, h / 2 - 12);
    ctx.font = '600 14px "DM Sans", sans-serif';
    ctx.fillText('avec ton doigt ou ta souris', w / 2, h / 2 + 22);

    return () => cancelAnimationFrame(etat.current.anim);
  }, []);

  // Animation des paillettes qui tombent
  const animer = () => {
    const s = etat.current;
    const c = toileMiettes.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    s.miettes = s.miettes.filter((m) => m.vie > 0);
    s.miettes.forEach((m) => {
      m.vy += 0.35;
      m.x += m.vx;
      m.y += m.vy;
      m.r += m.vr;
      m.vie -= 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, m.vie / 25);
      ctx.translate(m.x, m.y);
      ctx.rotate(m.r);
      ctx.fillStyle = m.couleur;
      ctx.fillRect(-m.t / 2, -m.t / 3, m.t, m.t * 0.66);
      ctx.restore();
    });
    s.anim = s.miettes.length ? requestAnimationFrame(animer) : 0;
  };

  const ajouterMiettes = (x, y) => {
    const s = etat.current;
    for (let i = 0; i < 3; i++) {
      const gris = 150 + Math.floor(Math.random() * 90);
      s.miettes.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -Math.random() * 1.5,
        r: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        t: 2 + Math.random() * 3.5,
        vie: 35 + Math.random() * 25,
        couleur: `rgb(${gris},${gris + 3},${gris + 6})`,
      });
    }
    if (s.miettes.length > 400) s.miettes.splice(0, s.miettes.length - 400);
    if (!s.anim) s.anim = requestAnimationFrame(animer);
  };

  const position = (e) => {
    const r = toile.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pourcentageGratte = () => {
    const c = toile.current;
    const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    let vides = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 40) {
      total++;
      if (data[i] < 20) vides++;
    }
    return vides / total;
  };

  // Pinceau irrégulier : plein de petits cercles au hasard le long du trajet
  const tamponner = (ctx, x, y) => {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const dist = Math.random() * 11;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, 6 + Math.random() * 9, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const gratter = (e) => {
    const s = etat.current;
    if (!s.actif || s.termine) return;
    const ctx = toile.current.getContext('2d');
    const p = position(e);
    const depart = s.dernier || p;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    const dx = p.x - depart.x;
    const dy = p.y - depart.y;
    const pas = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 5));
    for (let i = 0; i <= pas; i++) {
      tamponner(ctx, depart.x + (dx * i) / pas, depart.y + (dy * i) / pas);
    }
    ctx.globalCompositeOperation = 'source-over';
    ajouterMiettes(p.x, p.y);

    // Petite vibration (téléphones Android)
    const maintenant = Date.now();
    if (navigator.vibrate && maintenant - s.vibre > 90) {
      navigator.vibrate(8);
      s.vibre = maintenant;
    }

    s.dernier = p;
    s.compteur++;
    if (s.compteur % 10 === 0 && pourcentageGratte() > 0.6) {
      s.termine = true;
      if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
      setFini(true);
      pluieDeSapins();
      onFini && onFini();
    }
  };

  return (
    <div ref={boite} className="carte-grattage">
      {children}
      <canvas
        ref={toile}
        className={'couche-grattage' + (fini ? ' disparue' : '')}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          etat.current.actif = true;
          etat.current.dernier = null;
          gratter(e);
        }}
        onPointerMove={gratter}
        onPointerUp={() => { etat.current.actif = false; }}
        onPointerCancel={() => { etat.current.actif = false; }}
        aria-label="Carte à gratter : gratte pour découvrir ton Secret Santa"
        role="img"
      />
      <canvas ref={toileMiettes} className="miettes" aria-hidden="true" />
    </div>
  );
}
