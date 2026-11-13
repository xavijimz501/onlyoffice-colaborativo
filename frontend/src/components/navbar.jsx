import { useNavigate } from 'react-router-dom'
import buenGobiernoLogo from '../assets/Buen_gobierno_colores.svg'

export default function NavbarGobMX() {
  const navigate = useNavigate()
  const isAuthenticated = Boolean(localStorage.getItem('token'))

  function handleSessionAction() {
    if (isAuthenticated) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      navigate('/login', { replace: true })
      return
    }
    navigate('/login')
  }

  return (
    <section className="subheader">
      <div className="subheader__contenedor">
        <img className="subheader__logo" src={buenGobiernoLogo} alt="Buen Gobierno" />
        <details className="mexico__details navHeader__details">
          <summary className="mexico__summary"><span className="mexico__span">Menú</span></summary>
          <nav className="navHeader">
            <ul className="navHeader__ul mexico__detailsCont">
              <li className="navHeader__li"><a href="#" aria-current="page" className="navHeader__a">Inicio</a></li>
              <li className="navHeader__li"><a href="#" className="navHeader__a">Qué hacemos</a></li>
              <li className="navHeader__li"><a href="#" className="navHeader__a">Prensa</a></li>
              <li className="navHeader__li"><a href="#" className="navHeader__a">Blog</a></li>
            </ul>
          </nav>
        </details>
        <div className="iniciarSesion">
          <a type="button" onClick={handleSessionAction} className="iniciarSesion__a cta session-button">
            <span className="iniciarSesion__txt">{isAuthenticated ? 'Cerrar sesión' : 'Iniciar sesión'}</span>
          </a>
        </div>
      </div>
    </section>
  )
}
