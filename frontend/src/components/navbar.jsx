import React from 'react';

export default function navbarGobMX() {
    return (
        <section className="subheader">
            <div className="subheader__contenedor">
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

                <button type="button" className="boton__limpio">
                    <i className="snd__icono snd-accessibility--alt icono--32 icono--circuloRojo" aria-hidden="true"></i>
                    <span className="oculto">
                        Opciones de accesibilidad
                    </span>
                </button>

                <div className="idioma">
                    <div className="idioma__cont idioma--sm">
                        <label htmlFor="idioma-select-sm" className="oculto">
                            Selecciona idioma
                        </label>
                        <select className="idioma__select" id="idioma-select-sm">
                            <option lang="es">Es</option>
                            <option lang="en">En</option>
                            <option lang="de">De</option>
                            <option lang="it">It</option>
                            <option lang="fr">Fr</option>
                            <option lang="pt">Pt</option>
                        </select>
                        <div className="idioma__marker" aria-hidden="true">
                            <i className="snd__icono snd-chevron--down color--blanco" aria-hidden="true"></i>
                        </div>
                    </div>

                    <div className="idioma__cont idioma--lg">
                        <label htmlFor="idioma-select-lg" className="oculto">
                            Selecciona idioma
                        </label>
                        <select className="idioma__select" id="idioma-select-lg">
                            <option lang="es">Español</option>
                            <option lang="en">English</option>
                            <option lang="de">Deutsch</option>
                            <option lang="it">Italiano</option>
                            <option lang="fr">Français</option>
                            <option lang="pt">Português</option>
                        </select>
                        <div className="idioma__marker" aria-hidden="true">
                            <i className="snd__icono snd-chevron--down color--blanco" aria-hidden="true"></i>
                        </div>
                    </div>
                </div>

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