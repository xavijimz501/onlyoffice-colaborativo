import React from 'react';

export default function FooterGobMX() {
    return (
        <footer className="footer">
            <div className="footer__contenedor">
                <div className="footer__mexico">
                    <i className="snd__icono snd-gobierno-mexico footer__escudo color--origen" aria-hidden="true"></i>
                </div>

                <div className="footer__colCentral">
                    <div className="footer__gobmx">
                        <details className="mexico__details" open>
                            <summary className="footer__summary footer__summary--gobmx">
                                <span className="footer__tit">
                                    ¿Qué es gob.mx?
                                </span>
                            </summary>
                            <p className="mexico__detailsp">
                                Es el portal único de trámites, información y participación ciudadana.{' '}
                                <a href="https://www.gob.mx/que-es-gobmx" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                    <b>
                                        Leer más
                                    </b>
                                </a>
                            </p>
                        </details>
                    </div>

                    <div className="footer__enlaces">
                        <details className="mexico__details" open>
                            <summary className="footer__summary footer__summary--enlaces">
                                <span className="footer__tit">
                                    Enlaces
                                </span>
                            </summary>
                            <div className="footer__enlacesList">
                                <div className="footer__enlacesCol1">
                                    <a className="footer__enlacesLink" href="https://datos.gob.mx/" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Datos
                                    </a>
                                    <a className="footer__enlacesLink" href="https://www.gob.mx/inafed/acciones-y-programas/portal-de-obligaciones-de-transparencia-pot" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Portal de Obligaciones de Transparencia
                                    </a>
                                    <a className="footer__enlacesLink" href="https://www.plataformadetransparencia.org.mx/Inicio" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Plataforma Nacional de Transparencia
                                    </a>
                                    <a className="footer__enlacesLink" href="https://alertadores.buengobierno.gob.mx/" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Alerta
                                    </a>
                                </div>
                                <div className="footer__enlacesCol2">
                                    <a className="footer__enlacesLink" href="#" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Administraciones anteriores
                                    </a>
                                    <a className="footer__enlacesLink" href="https://www.gob.mx/accesibilidad" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Declaración de accesibilidad
                                    </a>
                                    <a className="footer__enlacesLink" href="http://www.ordenjuridico.gob.mx/" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Marco jurídico
                                    </a>
                                    <a className="footer__enlacesLink" href="#" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Política de seguridad
                                    </a>
                                    <a className="footer__enlacesLink" href="https://www.gob.mx/terminos" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Términos y condiciones
                                    </a>
                                    <a className="footer__enlacesLink" href="#" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Aviso de privacidad
                                    </a>
                                    <a className="footer__enlacesLink" href="#" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Aviso de privacidad simplificado
                                    </a>
                                    <a className="footer__enlacesLink" href="#" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                                        Mapa de sitio
                                    </a>
                                </div>
                            </div>
                        </details>
                    </div>
                </div>

                <div className="footer__redes">
                    <p className="footer__denuncia">
                        <a href="https://sidec.buengobierno.gob.mx/#!/" target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva">
                            Denuncia contra servidores públicos
                        </a>
                    </p>

                    <div className="footer__siguenosCont">
                        <p className="footer__siguenosTit">
                            Síguenos en
                        </p>
                        <ul className="footer__redes__ul">
                            <li>
                                <a target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva" href="https://www.facebook.com/gobmexico" aria-label="Facebook de Presidencia">
                                    <i className="snd__icono snd-snd-facebook" aria-hidden="true"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva" href="https://twitter.com/GobiernoMX" aria-label="Twitter de Presidencia">
                                    <i className="snd__icono snd-snd-x" aria-hidden="true"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva" href="https://www.instagram.com/gobmexico/" aria-label="Instagram de Presidencia">
                                    <i className="snd__icono snd-snd-instagram" aria-hidden="true"></i>
                                </a>
                            </li>
                            <li>
                                <a target="_blank" rel="noopener noreferrer" title="El enlace abre en ventana nueva" href="https://www.youtube.com/@gobiernodemexico" aria-label="Youtube de Presidencia">
                                    <i className="snd__icono snd-snd-youtube" aria-hidden="true"></i>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div className="footer__079">
                        <div className="footer__079col1">
                            <i className="snd__icono snd-snd-079 footer__079img" aria-hidden="true"></i>
                            <span className="footer__079num">
                                079
                            </span>
                        </div>
                        <div className="footer__079info">
                            <span className="footer__079txt">
                                Comunícate,
                                <br />
                                estamos para ayudarte
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}