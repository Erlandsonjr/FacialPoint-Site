import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaSignInAlt,
  FaRocket,
  FaQuestionCircle,
  FaFingerprint,
  FaDesktop,
  FaChartLine,
  FaShieldAlt,
  FaAngleDown,
  FaGithub,
  FaEnvelope,
  FaArrowRight,
  FaLock,
  FaUserCircle,
  FaUsers,
  FaCogs,
  FaCameraRetro,
  FaClipboardList,
} from "react-icons/fa";
import "./HomePage.css";

function HomePage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollToSection = (id) => {
    console.log(`Tentando rolar para ${id}`);

    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        console.log(`Elemento encontrado: ${id}`);

        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });

        setTimeout(() => {
          window.scrollBy(0, -80);
        }, 100);
      } else {
        console.error(`Elemento não encontrado: ${id}`);
      }
    }, 100);
  };

  return (
    <div className="landing-container">
      <header className={`landing-header ${scrolled ? "scrolled" : ""}`}>
        <div className="header-content">
          <Link to="/" className="logo-container">
            <img src="/logo.png" alt="FacePonto Logo" className="logo-image" />
            <h1 className="logo-title">FacePonto</h1>
          </Link>
          <nav className="header-nav">
            <button
              onClick={() => scrollToSection("features")}
              className="nav-link"
            >
              Recursos
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="nav-link"
            >
              Como Funciona
            </button>
            <Link to="/login" className="nav-button">
              <FaSignInAlt style={{ marginRight: "8px" }} /> Acessar Sistema
            </Link>
          </nav>
        </div>
      </header>

      <section className="hero-section section">
        <div className="section-container hero-content">
          <div className="hero-text">
            <h1>
              Controle de Ponto <span className="highlight">Inteligente</span> e{" "}
              <span className="highlight">Seguro</span>
            </h1>
            <p className="subtitle">
              Modernize a gestão de presença da sua empresa com nossa solução
              avançada de reconhecimento facial. Precisão, segurança e
              facilidade em um só lugar.
            </p>
            <div className="hero-buttons">
              <Link to="/registro" className="hero-button primary">
                <FaLock /> Área Administrativa
              </Link>
              <Link to="/login" className="hero-button secondary">
                <FaUserCircle /> Dashboard Pessoal
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-placeholder" style={{ border: "none", boxShadow: "none", background: "none", padding: 0 }}>
              <img
                src="/logo.png"
                alt="FacePonto Logo"
                style={{
                  width: "100%",
                  maxWidth: 900,
                  height: "auto",
                  borderRadius: 16,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                  background: "none",
                  display: "block"
                }}
              />
            </div>
          </div>
        </div>
        <button
          className="scroll-indicator"
          onClick={() => scrollToSection("features")}
          aria-label="Rolar para próxima seção"
        >
          <span>Descubra Mais</span>
          <FaAngleDown />
        </button>
      </section>

      <section id="features" className="section">
        <div className="section-container">
          <div className="section-header">
            <h2>Recursos que Transformam sua Gestão</h2>
            <p>
              Descubra como o FacePonto simplifica e otimiza o controle de ponto
              na sua empresa.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaFingerprint />
              </div>
              <div>
                <h3>Precisão Biométrica</h3>
                <p>
                  Reconhecimento facial de alta acurácia para identificação
                  inequívoca dos colaboradores.
                </p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaDesktop />
              </div>
              <div>
                <h3>Quiosque Dedicado</h3>
                <p>
                  Interface intuitiva no terminal de ponto, facilitando o
                  registro rápido e sem contato.
                </p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaChartLine />
              </div>
              <div>
                <h3>Dashboard Completo</h3>
                <p>
                  Acompanhe registros, gere relatórios e gerencie usuários de
                  forma centralizada e eficiente.
                </p>
              </div>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaShieldAlt />
              </div>
              <div>
                <h3>Segurança de Dados</h3>
                <p>
                  Proteção robusta das informações biométricas e registros, em
                  conformidade com as normas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="section">
        <div className="section-container">
          <div className="section-header">
            <h2>Simples de Implementar, Fácil de Usar</h2>
            <p>Veja como o FacePonto funciona em três passos práticos.</p>
          </div>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>
                <FaCogs style={{ marginRight: "8px" }} />
                Cadastro e Configuração
              </h3>
              <p>
                Administradores cadastram colaboradores e configuram o sistema
                de forma rápida e segura.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>
                <FaCameraRetro style={{ marginRight: "8px" }} />
                Registro no Quiosque
              </h3>
              <p>
                Colaboradores registram o ponto simplesmente olhando para o
                quiosque. Rápido e sem atritos.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>
                <FaClipboardList style={{ marginRight: "8px" }} />
                Acompanhamento Online
              </h3>
              <p>
                Acesso individual ao dashboard para consulta de horários e
                histórico de presença detalhado.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="cta" className="section">
        <div className="section-container">
          <div className="cta-content">
            <h2>Pronto para Revolucionar seu Controle de Ponto?</h2>
            <p>
              Experimente a eficiência e segurança do FacePonto. Acesse sua área
              ou entre em contato para mais informações.
            </p>
            <div className="cta-button-group">
              <Link to="/registro" className="hero-button primary">
                <FaLock /> Acesso Administrativo
              </Link>
              <Link to="/login" className="hero-button secondary">
                <FaUserCircle /> Dashboard do Colaborador
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-column footer-brand">
            <Link
              to="/"
              className="logo-container"
              style={{ marginBottom: "16px" }}
            >
              <img
                src="/logo.png"
                alt="FacePonto Logo"
                className="logo-image"
              />
              <h1 className="logo-title">FacePonto</h1>
            </Link>
            <p>Simplificando o controle de presença com tecnologia de ponta.</p>
          </div>
          <div className="footer-column">
            <h4>Navegação Rápida</h4>
            <button
              onClick={() => scrollToSection("features")}
              className="footer-link"
            >
              Recursos
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="footer-link"
            >
              Como Funciona
            </button>
            <button
              onClick={() => window.location.href = "/login"}
              className="footer-link"
              type="button"
            >
              Acessar Sistema
            </button>
          </div>
          <div className="footer-column">
            <h4>Contato</h4>
            <a href="mailto:contato@faceponto.com.br" className="footer-link">
              <FaEnvelope />
              contato@faceponto.com.br
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} FacePonto. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
