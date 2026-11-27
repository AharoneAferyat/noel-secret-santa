import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.js';
import { DEFAULT_SETTINGS } from './config.js';
import { effectuerTirage, momentTirageAuto } from './tirage.js';
import Accueil from './pages/Accueil.jsx';
import Inscription from './pages/Inscription.jsx';
import MonEspace from './pages/MonEspace.jsx';
import Participants from './pages/Participants.jsx';
import Admin from './pages/Admin.jsx';

const PAGES = [
  { id: 'accueil', label: 'Accueil' },
  { id: 'inscription', label: "S'inscrire" },
  { id: 'espace', label: 'Mon espace' },
  { id: 'participants', label: 'Participants' },
];

const lirePage = () => (window.location.hash.replace('#', '') || 'accueil');

export default function App() {
  const [page, setPage] = useState(lirePage);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [participants, setParticipants] = useState([]);
  const [charge, setCharge] = useState(false);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const f = () => setPage(lirePage());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  useEffect(() => {
    const u1 = onSnapshot(
      doc(db, 'settings', 'main'),
      (snap) => setSettings({ ...DEFAULT_SETTINGS, ...(snap.exists() ? snap.data() : {}) }),
      (e) => setErreur('Connexion à la base impossible : ' + e.message)
    );
    const u2 = onSnapshot(
      collection(db, 'participants'),
      (snap) => {
        const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        liste.sort((a, b) => a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr'));
        setParticipants(liste);
        setCharge(true);
      },
      (e) => setErreur('Connexion à la base impossible : ' + e.message)
    );
    return () => {
      u1();
      u2();
    };
  }, []);

  // Tirage automatique : fait par le premier visiteur après la date prévue à 00h01
  const tentative = useRef(false);
  useEffect(() => {
    if (!charge || tentative.current) return;
    if (settings.tirageFait || settings.tirageAutoActif === false) return;
    const moment = momentTirageAuto(settings.dateTirage);
    if (!moment) return;
    const lancer = () => {
      if (tentative.current) return;
      tentative.current = true;
      effectuerTirage({ auto: true }).catch(() => {});
    };
    const reste = moment.getTime() - Date.now();
    if (reste <= 0) {
      lancer();
      return;
    }
    if (reste < 24 * 3600 * 1000) {
      const t = setTimeout(lancer, reste + 2000);
      return () => clearTimeout(t);
    }
  }, [charge, settings.tirageFait, settings.tirageAutoActif, settings.dateTirage]);

  const go = (p) => {
    window.location.hash = p;
    window.scrollTo(0, 0);
  };

  const props = { settings, participants, charge, go };

  return (
    <div className="app">
      <header className="entete">
        <a href="#accueil" className="logo" onClick={() => window.scrollTo(0, 0)}>
          Noël <span className="or">&amp; Secret Santa</span>
        </a>
        <nav className="nav">
          {PAGES.map((p) => (
            <a key={p.id} href={'#' + p.id} className={page === p.id ? 'actif' : ''}>
              {p.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="contenu">
        {erreur && <div className="alerte erreur">{erreur}</div>}
        {page === 'accueil' && <Accueil {...props} />}
        {page === 'inscription' && <Inscription {...props} />}
        {page === 'espace' && <MonEspace {...props} />}
        {page === 'participants' && <Participants {...props} />}
        {page === 'admin' && <Admin {...props} />}
      </main>

      <footer className="pied">
        <span>Joyeuses fêtes !</span>
        <a href="#admin">Admin</a>
      </footer>
    </div>
  );
}
