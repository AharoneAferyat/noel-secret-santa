import { useEffect, useState } from 'react';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { PARTICIPATIONS } from '../config.js';
import { fmtDate, hashPin, keyOf, participationDe } from '../utils.js';
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
    return <Connexion onOk={(s) => { localStorage.setItem('noel_session', JSON.stringify(s)); setSession(s); }} />;
  }

  const deconnexion = () => {
    localStorage.removeItem('noel_session');
    setSession(null);
  };

  return <Espace moi={moi} settings={settings} participants={participants} onDeconnexion={deconnexion} />;
}

function Connexion({ onOk }) {
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [pin, setPin] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    const key = keyOf(prenom, nom);
    setEnvoi(true);
    try {
      const snap = await getDoc(doc(db, 'participants', key));
      const pinHash = await hashPin(pin, key);
      if (!snap.exists()) setErreur("Aucune inscription trouvée à ce nom. Vérifie l'orthographe ou inscris-toi.");
      else if (snap.data().pinHash !== pinHash) setErreur('Code PIN incorrect. En cas d’oubli, demande à l’organisateur de le réinitialiser.');
      else onOk({ key, pinHash });
    } catch (err) {
      setErreur('Erreur : ' + err.message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="bloc">
      <h1 className="titre-page">Mon espace</h1>
      <p>Connecte-toi pour modifier ton inscription, voter pour les dates et découvrir ton Secret Santa.</p>
      <form onSubmit={valider} className="formulaire">
        <div className="ligne2">
          <label>Prénom<input value={prenom} onChange={(e) => setPrenom(e.target.value)} /></label>
          <label>Nom<input value={nom} onChange={(e) => setNom(e.target.value)} /></label>
        </div>
        <label>Code PIN<input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" type="password" /></label>
        {erreur && <div className="alerte erreur">{erreur}</div>}
        <button className="btn rouge large" disabled={envoi}>{envoi ? 'Connexion…' : 'Me connecter'}</button>
        <p className="aide">Pas encore inscrit·e ? <a href="#inscription">Inscris-toi ici</a>.</p>
      </form>
    </section>
  );
}

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
          {settings.tirageFait && cible && !devoile && (
            <button className="btn blanc" onClick={() => setDevoile(true)}>Découvrir à qui j'offre mon cadeau</button>
          )}
          {settings.tirageFait && cible && devoile && (
            <div className="revelation">
              <p>Tu offres un cadeau à…</p>
              <p className="nom-cible">{cible.prenom} {cible.nom}</p>
              <p className="titre-cible">{cible.titre}</p>
              {settings.budget && <p>Budget : {settings.budget} € maximum</p>}
              <p className="aide-claire">Chut… c'est un secret !</p>
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
