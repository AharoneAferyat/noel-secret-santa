import { fmtDate } from '../utils.js';
import { INFO_REPAS } from '../config.js';

export default function Accueil({ settings, participants, go }) {
  const nbRepas = participants.filter((p) => p.repas).length;
  const nbSanta = participants.filter((p) => p.santa).length;

  return (
    <>
      <section className="hero">
        <div className="hero-int">
        <p className="kicker">Invitation · Fin d'année</p>
        <h1>
          <span className="blanc">Repas de Noël</span>
          <br />
          <span className="or">&amp; Secret Santa</span>
        </h1>
        <p className="sous-titre">Venez au repas, jouez au Secret Santa… ou faites les deux !</p>
        <div className="boutons">
          <button className="btn rouge" onClick={() => go('inscription')}>Je m'inscris</button>
          <button className="btn contour" onClick={() => go('espace')}>Déjà inscrit·e ? Mon espace</button>
        </div>
        {settings.dateLimite && (
          <p className="limite">Inscriptions et votes avant le <strong>{fmtDate(settings.dateLimite)}</strong></p>
        )}
        </div>
      </section>

      <section className="cartes">
        <div className="carte fond-vert">
          <h2>Le repas de Noël</h2>
          <p>Un moment convivial, tous ensemble, pour fêter la fin d'année.</p>
          <p><strong>{INFO_REPAS}</strong></p>
          <div className="encart">
            {settings.dateRetenue ? (
              <>Date retenue : <strong>{fmtDate(settings.dateRetenue)}</strong></>
            ) : (
              <>Date à choisir ensemble : votez pour vos disponibilités.</>
            )}
            {settings.lieu && (
              <>
                <br />Lieu : <strong>{settings.lieu}</strong>
              </>
            )}
          </div>
          <p className="compteur">{nbRepas} participant{nbRepas > 1 ? 's' : ''}</p>
        </div>
        <div className="carte fond-rouge">
          <h2>Le Secret Santa</h2>
          <p>Un tirage au sort vous désigne la personne à qui offrir un cadeau, en toute discrétion.</p>
          <div className="encart">
            {settings.budget ? <>Budget cadeau : <strong>{settings.budget} € maximum</strong></> : <>Budget cadeau : bientôt annoncé</>}
            <br />
            {settings.tirageFait ? <strong>Le tirage a eu lieu ! Découvrez votre résultat dans « Mon espace ».</strong> : <>Résultat du tirage : {settings.dateTirage ? <>à partir du <strong>{fmtDate(settings.dateTirage)}</strong></> : 'après la clôture des inscriptions'}.</>}
          </div>
          <p className="compteur">{nbSanta} participant{nbSanta > 1 ? 's' : ''}</p>
        </div>
      </section>

      <section className="etapes">
        <h2 className="titre-section">Comment ça marche ?</h2>
        <ol>
          <li><span className="num rouge">1</span><div><strong>Inscrivez-vous</strong><br />prénom, nom, poste, et à quoi vous participez.</div></li>
          <li><span className="num vert">2</span><div><strong>Votez pour la date</strong><br />cochez les jours où vous êtes disponible.</div></li>
          <li><span className="num or">3</span><div><strong>Le tirage au sort</strong><br />chacun découvre ici à qui offrir son cadeau.</div></li>
        </ol>
      </section>
    </>
  );
}
