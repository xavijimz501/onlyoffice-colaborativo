import React from 'react';
import buenGobiernoLogo from "../assets/Buen_gobierno_colores.svg";

export default function navbarGobMX() {
    return (
        <section className="subheader">
            <div className="subheader__contenedor">2
                <img
                    className="subheader__logo"
                    src={buenGobiernoLogo}
                    alt="Buen Gobierno"
                />
                <details className="mexico__details navHeader__details">
                    <summary className="mexico__summary">
                        <span className="mexico__span">
                            Menú
                        </span>
                    </summary>
                    <nav className="navHeader">
                        <ul className="navHeader__ul mexico__detailsCont">
                            <li className="navHeader__li">
                                <a href="#" aria-current="page" className="navHeader__a">
                                    Inicio
                                </a>
                            </li>
                            <li className="navHeader__li">
                                <a href="#" className="navHeader__a">
                                    Qué hacemos
                                </a>
                            </li>
                            <li className="navHeader__li">
                                <a href="#" className="navHeader__a">
                                    Prensa
                                </a>
                            </li>
                            <li className="navHeader__li">
                                <a href="#" className="navHeader__a">
                                    Blog
                                </a>
                            </li>
                        </ul>
                    </nav>
                </details>

                <div className="iniciarSesion">
                    <a href="#" className="iniciarSesion__a cta">
                        <span className="iniciarSesion__txt">
                            Iniciar sesión
                        </span>
                        <i className="snd__icono snd-snd-llaveMX iniciarSesion__logollave" aria-hidden="true"></i>
                    </a>
                </div>
            </div>
        </section>
    );
}