import { fmtDate, fmtDateCourt } from '../utils.js';
import { Pastilles } from '../components.jsx';

export default function Participants({ settings, participants, charge }) {
  const repas = participants.filter((p) => p.repas);
  const dates = [...(settings.dates || [])].sort();
  const max = Math.max(1, ...dates.map((d) => repas.filter((p) => (p.dispos || []).includes(d)).length));

  return (
    <section className="bloc">
      <h1 className="titre-page">Participants</h1>

      <h2 className="titre-section">Inscrits ({participants.length})</h2>
      {!charge && <p>Chargement…</p>}
      {charge && participants.length === 0 && <p>Personne pour l'instant. Sois le premier ou la première !</p>}
      <ul className="liste">
        {participants.map((p) => (
          <li key={p.id}>
            <div>
              <strong>{p.prenom} {p.nom}</strong>
              <span className="aide"> · {p.titre}</span>
            </div>
            <Pastilles p={p} />
          </li>
        ))}
      </ul>

      {!settings.dateRetenue && dates.length > 0 && (
        <div className="sondage">
          <h2 className="titre-section">Sondage : date du repas</h2>
          {dates.map((d) => {
            const qui = repas.filter((p) => (p.dispos || []).includes(d));
            return (
              <div key={d} className="barre-ligne">
                <div className="barre-label">
                  <strong>{fmtDateCourt(d)}</strong>
                  <span>{qui.length} dispo{qui.length > 1 ? 's' : ''}</span>
                </div>
                <div className="barre"><div style={{ width: `${(qui.length / max) * 100}%` }} /></div>
                {qui.length > 0 && <div className="aide">{qui.map((p) => p.prenom).join(', ')}</div>}
              </div>
            );
          })}
        </div>
      )}
      {settings.dateRetenue && (
        <div className="alerte ok">Date du repas : <strong>{fmtDate(settings.dateRetenue)}</strong></div>
      )}

    </section>
  );
}
