import React from 'react';

export default function HeaderGobMX() {
    return (
        <header className="header">
            <a className="irContent" href="#mainContent">
                Ir al contenido principal
            </a>
            <section className="mexico">
                <div className="mexico__contenedor container">
                    <div className="mexico__escudo">
                        <a
                            href="https://www.gob.mx/"
                            className="mexico__aescudo"
                            aria-label="Ir a la pagina de inicio del Gobierno de Mexico"
                        >
                            <i className="snd__icono snd-gobierno-mexico mexico__img color--origen" aria-hidden="true"></i>
                        </a>
                    </div>
                    <div className="mexico__menu">
                        <details className="mexico__details" open>
                            <summary className="mexico__summary">
                                <span className="mexico__span">
                                    Menu
                                </span>
                            </summary>
                            <div className="mexico__detailsCont">
                                <a href="https://www.gob.mx/tramites" className="mexico__a">
                                    Tramites
                                </a>
                                <a href="https://www.gob.mx/gobierno" className="mexico__a">
                                    Gobierno
                                </a>
                            </div>
                        </details>
                    </div>
                </div>
            </section>
        </header>
    );
}