import React, { useState, FC } from "react";
import "./../../css/silber.css";
import { assets } from "../pages/assets/assets";

/** Sidebar (Silber) */
const Silber: FC = () => {
  const [extended, setExtended] = useState(false);

  return (
    <aside className={`sidebar ${extended ? "extended" : ""}`}>
      {/* ----- Zona superior ----- */}
      <div className="top">
        <button
          className="icon-btn menu-toggle"
          onClick={() => setExtended((p) => !p)}
          aria-label={extended ? "Contraer menú" : "Expandir menú"}
        >
          <img src={assets.menu_icon} alt="" aria-hidden="true" />
        </button>

        <button className="new-chat">
          <img src={assets.plus_icon} alt="" aria-hidden="true" />
          {extended && <span>Nuevo chat</span>}
        </button>

        {extended && (
          <section className="recent">
            <h2 className="recent-title">Recientes</h2>

            <button className="recent-entry">
              <img src={assets.message_icon} alt="" aria-hidden="true" />
              <span>¿Qué es React…?</span>
            </button>
          </section>
        )}
      </div>

      {/* ----- Zona inferior ----- */}
      <div className="bottom">
        <button className="bottom-item recent-entry">
          <img src={assets.question_icon} alt="" aria-hidden="true" />
          {extended && <span>Ayuda</span>}
        </button>

        <button className="bottom-item recent-entry">
          <img src={assets.history_icon} alt="" aria-hidden="true" />
          {extended && <span>Actividad</span>}
        </button>

        <button className="bottom-item recent-entry">
          <img src={assets.setting_icon} alt="" aria-hidden="true" />
          {extended && <span>Ajustes</span>}
        </button>
      </div>
    </aside>
  );
};

export default Silber;
