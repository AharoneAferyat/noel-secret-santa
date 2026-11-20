import { PARTICIPATIONS } from './config.js';
import { fmtDate, fmtDateCourt } from './utils.js';

export function ChoixParticipation({ valeur, onChange, santaBloque }) {
  return (
    <div className="choix">
      {PARTICIPATIONS.map((p) => {
        const desactive = santaBloque && p.santa;
        return (
          <label key={p.id} className={'choix-item' + (valeur === p.id ? ' coche' : '') + (desactive ? ' off' : '')}>
            <input
              type="radio"
              name="participation"
              value={p.id}
              checked={valeur === p.id}
              disabled={desactive}
              onChange={() => onChange(p.id)}
            />
            <span>{p.label}</span>
          </label>
        );
      })}
      {santaBloque && <p className="aide">Le tirage au sort a déjà eu lieu : il n'est plus possible de rejoindre le Secret Santa.</p>}
    </div>
  );
}

export function ChoixDispos({ settings, dispos, onChange }) {
  if (settings.dateRetenue) {
    return (
      <div className="alerte ok">
        La date du repas est fixée : <strong>{fmtDate(settings.dateRetenue)}</strong>
      </div>
    );
  }
  const dates = [...(settings.dates || [])].sort();
  if (!dates.length) {
    return <p className="aide">Les dates proposées pour le repas seront bientôt ajoutées. Tu pourras revenir voter depuis « Mon espace ».</p>;
  }
  const bascule = (d) => onChange(dispos.includes(d) ? dispos.filter((x) => x !== d) : [...dispos, d]);
  return (
    <div className="dates">
      {dates.map((d) => (
        <label key={d} className={'date-item' + (dispos.includes(d) ? ' coche' : '')}>
          <input type="checkbox" checked={dispos.includes(d)} onChange={() => bascule(d)} />
          <span>{fmtDateCourt(d)}</span>
        </label>
      ))}
    </div>
  );
}

export function Pastilles({ p }) {
  return (
    <span className="pastilles">
      {p.repas && <span className="pastille vert">Repas</span>}
      {p.santa && <span className="pastille rouge">Secret Santa</span>}
    </span>
  );
}
