import { useEffect, useRef, useState } from 'react';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { PARTICIPATIONS } from '../config.js';
import { fmtDate, hashPin, norm, participationDe } from '../utils.js';
import { ChoixDispos, ChoixParticipation, Pastilles } from '../components.jsx';

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

// Carte à gratter : on efface la couche dorée avec le doigt ou la souris.
export function Grattage({ children, onFini }) {
  const boite = useRef(null);
  const toile = useRef(null);
  const [fini, setFini] = useState(false);
  const etat = useRef({ actif: false, dernier: null, compteur: 0, termine: false });

  useEffect(() => {
    const c = toile.current;
    const b = boite.current;
    const dpr = window.devicePixelRatio || 1;
    const w = b.offsetWidth;
    const h = b.offsetHeight;
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);

    // Couche dorée
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#c9962a');
    g.addColorStop(0.45, '#f6d77a');
    g.addColorStop(0.55, '#f2c14e');
    g.addColorStop(1, '#b8841f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Petites étoiles
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 2 + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5a3d0a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '400 30px Anton, sans-serif';
    ctx.fillText('GRATTE ICI', w / 2, h / 2 - 12);
    ctx.font = '600 15px "DM Sans", sans-serif';
    ctx.fillText('avec ton doigt ou ta souris', w / 2, h / 2 + 22);
  }, []);

  const position = (e) => {
    const r = toile.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const pourcentageGratte = () => {
    const c = toile.current;
    const ctx = c.getContext('2d');
    const { data } = ctx.getImageData(0, 0, c.width, c.height);
    let vides = 0;
    let total = 0;
    for (let i = 3; i < data.length; i += 4 * 32) {
      total++;
      if (data[i] === 0) vides++;
    }
    return vides / total;
  };

  const gratter = (e) => {
    const s = etat.current;
    if (!s.actif || s.termine) return;
    const ctx = toile.current.getContext('2d');
    const p = position(e);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 46;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo((s.dernier || p).x, (s.dernier || p).y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    s.dernier = p;
    s.compteur++;
    if (s.compteur % 8 === 0 && pourcentageGratte() > 0.55) {
      s.termine = true;
      setFini(true);
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
    </div>
  );
}
