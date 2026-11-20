import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase.js';
import { DEFAULT_SETTINGS } from './config.js';
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

  const go = (p) => {
    window.location.hash = p;
    window.scrollTo(0, 0);
  };

  const props = { settings, participants, charge, go };

  return (
    <div className="app">
      <header className="entete">
        <svg className="guirlande" aria-hidden="true" viewBox="0 0 400 40" preserveAspectRatio="none">
          <path d="M0 6 Q 50 26 100 6 T 200 6 T 300 6 T 400 6" fill="none" stroke="#14532D" strokeWidth="2" />
          <circle cx="50" cy="26" r="6" fill="#C8102E" />
          <circle cx="150" cy="26" r="6" fill="#D4A017" />
          <circle cx="250" cy="26" r="6" fill="#14532D" />
          <circle cx="350" cy="26" r="6" fill="#C8102E" />
        </svg>
        <a href="#accueil" className="logo" onClick={() => window.scrollTo(0, 0)}>
          <span className="rouge">Repas de Noël</span> <span className="vert">&amp; Secret Santa</span>
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
