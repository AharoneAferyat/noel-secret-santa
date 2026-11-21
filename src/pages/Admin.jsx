import { useState } from 'react';
import { deleteDoc, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase.js';
import { ADMIN_CODE } from '../config.js';
import { fmtDate, fmtDateCourt, hashPin, tirage } from '../utils.js';
import { Pastilles } from '../components.jsx';

const majReglages = (champs) => setDoc(doc(db, 'settings', 'main'), champs, { merge: true });

export default function Admin(props) {
  const [ok, setOk] = useState(() => sessionStorage.getItem('noel_admin') === '1');
  const [code, setCode] = useState('');
  const [erreur, setErreur] = useState('');

  if (!ok) {
    return (
      <section className="bloc">
        <h1 className="titre-page">Admin</h1>
        <form
          className="formulaire"
          onSubmit={async (e) => {
            e.preventDefault();
            // Code défini depuis la page Admin (prioritaire), sinon celui de config.js
            const bon = props.settings.adminHash
              ? (await hashPin(code, '__admin__')) === props.settings.adminHash
              : code === ADMIN_CODE;
            if (bon) {
              sessionStorage.setItem('noel_admin', '1');
              setOk(true);
            } else setErreur('Code incorrect.');
          }}
        >
          <label>Code admin<input type="password" value={code} onChange={(e) => setCode(e.target.value)} /></label>
          {erreur && <div className="alerte erreur">{erreur}</div>}
          <button className="btn vert large">Entrer</button>
        </form>
      </section>
    );
  }
  return <Tableau {...props} />;
}

function Tableau({ settings, participants }) {
  const [budget, setBudget] = useState(settings.budget || '');
  const [dateLimite, setDateLimite] = useState(settings.dateLimite || '');
  const [lieu, setLieu] = useState(settings.lieu || '');
  const [dateTirage, setDateTirage] = useState(settings.dateTirage || '');
  const [nouvelleDate, setNouvelleDate] = useState('');
  const [message, setMessage] = useState('');
  const [voirResultats, setVoirResultats] = useState(false);

  const santa = participants.filter((p) => p.santa);
  const repas = participants.filter((p) => p.repas);
  const dates = [...(settings.dates || [])].sort();
  const flash = (m) => {
    setMessage(m);
    setTimeout(() => setMessage(''), 2500);
  };

  const enregistrerReglages = async (e) => {
    e.preventDefault();
    await majReglages({ budget: budget.trim(), dateLimite, dateTirage, lieu: lieu.trim() });
    flash('Réglages enregistrés');
  };

  const ajouterDate = async () => {
    if (!nouvelleDate || dates.includes(nouvelleDate)) return;
    await majReglages({ dates: [...dates, nouvelleDate] });
    setNouvelleDate('');
  };

  const retirerDate = async (d) => {
    if (!window.confirm(`Retirer le ${fmtDate(d)} du sondage ?`)) return;
    await majReglages({ dates: dates.filter((x) => x !== d), dateRetenue: settings.dateRetenue === d ? '' : settings.dateRetenue });
  };

  const lancerTirage = async () => {
    if (santa.length < 3) return window.alert('Il faut au moins 3 participants au Secret Santa.');
    if (!window.confirm(`Lancer le tirage au sort pour ${santa.length} personnes ? Chacun pourra voir son résultat dans « Mon espace ».`)) return;
    const res = tirage(santa.map((p) => p.id));
    const batch = writeBatch(db);
    santa.forEach((p) => batch.update(doc(db, 'participants', p.id), { cible: res[p.id] }));
    batch.set(doc(db, 'settings', 'main'), { tirageFait: true, tirageLe: new Date().toISOString(), inscriptionsOuvertes: settings.inscriptionsOuvertes }, { merge: true });
    await batch.commit();
    flash('Tirage effectué !');
  };

  const annulerTirage = async () => {
    if (!window.confirm('Annuler le tirage ? Tous les résultats seront effacés (il faudra relancer).')) return;
    const batch = writeBatch(db);
    participants.forEach((p) => batch.update(doc(db, 'participants', p.id), { cible: null }));
    batch.set(doc(db, 'settings', 'main'), { tirageFait: false, tirageLe: '' }, { merge: true });
    await batch.commit();
    setVoirResultats(false);
    flash('Tirage annulé');
  };

  const supprimer = async (p) => {
    if (!window.confirm(`Supprimer l'inscription de ${p.prenom} ${p.nom} ?`)) return;
    if (settings.tirageFait && p.santa) {
      if (!window.confirm('Attention : le tirage a eu lieu. Supprimer cette personne casse le tirage, il faudra l’annuler et le relancer. Continuer ?')) return;
    }
    await deleteDoc(doc(db, 'participants', p.id));
  };

  const nouveauPin = async (p) => {
    const pin = window.prompt(`Nouveau code PIN (4 chiffres) pour ${p.prenom} ${p.nom} :`);
    if (pin === null) return;
    if (!/^\d{4}$/.test(pin)) return window.alert('Le PIN doit contenir 4 chiffres.');
    await updateDoc(doc(db, 'participants', p.id), { pinHash: await hashPin(pin, p.id) });
    flash(`PIN de ${p.prenom} réinitialisé`);
  };

  const exporterCSV = () => {
    const lignes = [['Prénom', 'Nom', 'Poste', 'Repas', 'Secret Santa', 'Disponibilités']];
    participants.forEach((p) => {
      lignes.push([p.prenom, p.nom, p.titre, p.repas ? 'oui' : 'non', p.santa ? 'oui' : 'non', (p.dispos || []).join(' / ')]);
    });
    const csv = '﻿' + lignes.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'participants-noel.csv';
    a.click();
  };

  return (
    <section className="bloc">
      <div className="entete-espace">
        <h1 className="titre-page">Admin</h1>
        <button className="btn contour petit" onClick={() => { sessionStorage.removeItem('noel_admin'); window.location.reload(); }}>Quitter</button>
      </div>
      {message && <div className="alerte ok flottant">{message}</div>}

      <div className="stats">
        <div><strong>{participants.length}</strong><span>inscrits</span></div>
        <div><strong>{repas.length}</strong><span>au repas</span></div>
        <div><strong>{santa.length}</strong><span>Secret Santa</span></div>
      </div>

      <div className="panneau">
        <h2 className="titre-section">Réglages</h2>
        <form onSubmit={enregistrerReglages} className="formulaire">
          <div className="ligne2">
            <label>Budget cadeau (€)<input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="ex. 15" /></label>
            <label>Date limite d'inscription<input type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} /></label>
          </div>
          <div className="ligne2">
            <label>Résultats du tirage à partir du<input type="date" value={dateTirage} onChange={(e) => setDateTirage(e.target.value)} /></label>
            <label>Lieu du repas (facultatif)<input value={lieu} onChange={(e) => setLieu(e.target.value)} /></label>
          </div>
          <button className="btn vert">Enregistrer</button>
        </form>
        <label className="interrupteur">
          <input type="checkbox" checked={settings.inscriptionsOuvertes} onChange={(e) => majReglages({ inscriptionsOuvertes: e.target.checked })} />
          <span>Inscriptions ouvertes</span>
        </label>
      </div>

      <div className="panneau">
        <h2 className="titre-section">Sondage : dates du repas</h2>
        <div className="ajout-date">
          <input type="date" value={nouvelleDate} onChange={(e) => setNouvelleDate(e.target.value)} />
          <button className="btn vert petit" onClick={ajouterDate}>Ajouter</button>
        </div>
        {dates.length === 0 && <p className="aide">Aucune date proposée pour l'instant.</p>}
        <ul className="liste">
          {dates.map((d) => {
            const n = repas.filter((p) => (p.dispos || []).includes(d)).length;
            const retenue = settings.dateRetenue === d;
            return (
              <li key={d} className={retenue ? 'retenue' : ''}>
                <div>
                  <strong>{fmtDateCourt(d)}</strong> <span className="aide">· {n} dispo{n > 1 ? 's' : ''} sur {repas.length}</span>
                  {retenue && <span className="pastille vert">Retenue</span>}
                </div>
                <div className="actions">
                  {retenue ? (
                    <button className="btn contour petit" onClick={() => majReglages({ dateRetenue: '' })}>Annuler</button>
                  ) : (
                    <button className="btn vert petit" onClick={() => majReglages({ dateRetenue: d })}>Retenir</button>
                  )}
                  <button className="lien-danger" onClick={() => retirerDate(d)}>Retirer</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="panneau">
        <h2 className="titre-section">Tirage au sort</h2>
        {!settings.tirageFait ? (
          <>
            <p>{santa.length} participant{santa.length > 1 ? 's' : ''} au Secret Santa. Pense à fermer les inscriptions avant de lancer le tirage.</p>
            <button className="btn rouge" onClick={lancerTirage}>Lancer le tirage</button>
          </>
        ) : (
          <>
            <div className="alerte ok">Tirage effectué le {new Date(settings.tirageLe).toLocaleString('fr-FR')}.</div>
            {(() => {
              const sansCible = santa.filter((p) => !participants.some((x) => x.id === p.cible));
              return sansCible.length === 0 ? (
                <p className="aide">Vérification : les {santa.length} participants ont bien chacun une personne attribuée. Les résultats restent secrets, même pour toi.</p>
              ) : (
                <div className="alerte erreur">{sansCible.length} personne(s) sans attribution ({sansCible.map((p) => p.prenom).join(', ')}). Annule et relance le tirage.</div>
              );
            })()}
            <div className="actions">
              <button className="lien-danger" onClick={annulerTirage}>Annuler le tirage</button>
            </div>
            <details className="cache">
              <summary>Options avancées</summary>
              <p className="aide">À n'utiliser qu'en cas de problème : cela te dévoile qui offre à qui (y compris ton propre tirage).</p>
              {!voirResultats ? (
                <button
                  className="btn contour petit"
                  onClick={() => {
                    const r = window.prompt('Tu vas voir tous les résultats du tirage. Tape VOIR pour confirmer :');
                    if (r && r.trim().toUpperCase() === 'VOIR') setVoirResultats(true);
                  }}
                >
                  Afficher tous les résultats
                </button>
              ) : (
                <button className="btn contour petit" onClick={() => setVoirResultats(false)}>Masquer les résultats</button>
              )}
            </details>
            {voirResultats && (
              <ul className="liste">
                {santa.map((p) => {
                  const c = participants.find((x) => x.id === p.cible);
                  return (
                    <li key={p.id}>
                      <span>{p.prenom} {p.nom} → <strong>{c ? `${c.prenom} ${c.nom}` : '—'}</strong></span>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="panneau">
        <div className="entete-espace">
          <h2 className="titre-section">Inscrits</h2>
          <button className="btn contour petit" onClick={exporterCSV}>Exporter (Excel)</button>
        </div>
        <ul className="liste">
          {participants.map((p) => (
            <li key={p.id}>
              <div>
                <strong>{p.prenom} {p.nom}</strong> <span className="aide">· {p.titre}</span>
                <div><Pastilles p={p} /></div>
              </div>
              <div className="actions">
                <button className="btn contour petit" onClick={() => nouveauPin(p)}>Nouveau PIN</button>
                <button className="lien-danger" onClick={() => supprimer(p)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ChangerCodeAdmin settings={settings} onFait={() => flash('Code admin modifié')} />
    </section>
  );
}

function ChangerCodeAdmin({ settings, onFait }) {
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirm, setConfirm] = useState('');
  const [erreur, setErreur] = useState('');

  const valider = async (e) => {
    e.preventDefault();
    setErreur('');
    const bon = settings.adminHash
      ? (await hashPin(actuel, '__admin__')) === settings.adminHash
      : actuel === ADMIN_CODE;
    if (!bon) return setErreur('Le code actuel est incorrect.');
    if (nouveau.length < 4) return setErreur('Le nouveau code doit faire au moins 4 caractères.');
    if (nouveau !== confirm) return setErreur('Les deux nouveaux codes ne sont pas identiques.');
    await majReglages({ adminHash: await hashPin(nouveau, '__admin__') });
    setActuel('');
    setNouveau('');
    setConfirm('');
    onFait();
  };

  return (
    <div className="panneau">
      <h2 className="titre-section">Changer le code admin</h2>
      <form onSubmit={valider} className="formulaire">
        <label>Code actuel<input type="password" value={actuel} onChange={(e) => setActuel(e.target.value)} autoComplete="current-password" /></label>
        <div className="ligne2">
          <label>Nouveau code<input type="password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} autoComplete="new-password" /></label>
          <label>Confirmer<input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></label>
        </div>
        {erreur && <div className="alerte erreur">{erreur}</div>}
        <button className="btn vert">Changer le code</button>
      </form>
    </div>
  );
}
