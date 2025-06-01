import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaUserCircle, 
  FaFingerprint, 
  FaBuilding, 
  FaChartLine, 
  FaShieldAlt,
  FaClock,
  FaDesktop,
  FaAngleDown,
  FaGithub,
  FaEnvelope,
  FaArrowRight,
  FaLock
} from 'react-icons/fa';
import './HomePage.css';

function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  
  // Garantir que o corpo da página tenha rolagem
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);
  
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 30;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    document.addEventListener('scroll', handleScroll);
    return () => {
      document.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-container">
      {/* Header */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="header-content">
          <div className="logo-container">
            <img src="/logo.png" alt="FacePonto Logo" className="logo-image" />
            <h1 className="logo-title">FacePonto</h1>
          </div>
          
          <nav className="header-nav">
            <button onClick={() => scrollToSection('features')} className="nav-link">Recursos</button>
            <button onClick={() => scrollToSection('how-it-works')} className="nav-link">Como Funciona</button>
            <Link to="/login" className="nav-button">Acessar Sistema</Link>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-text">
              <h1>Controle de Ponto com Reconhecimento Facial</h1>
              <p>Sistema exclusivo de controle de frequência para colaboradores através de quiosque com tecnologia facial avançada instalado na empresa.</p>
              
              <div className="hero-buttons">
                <Link to="/registro" className="primary-button">
                  <FaLock /> Acesso Administrativo
                </Link>
                <Link to="/login" className="secondary-button">
                  <FaUserCircle /> Acessar Dashboard
                </Link>
              </div>
            </div>
            
            <div className="hero-image">
              <img src="/hero-image.png" alt="FacePonto em uso" className="main-illustration" />
            </div>
          </div>
          
          <button className="scroll-indicator" onClick={() => scrollToSection('features')}>
            <span>Conheça mais</span>
            <FaAngleDown />
          </button>
          
          <div className="wave-decoration">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
              <path fill="#333333" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,213.3C960,203,1056,181,1152,186.7C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="section-header">
            <h2>Recursos Principais</h2>
            <p>Sistema corporativo completo, seguro e fácil de usar</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <FaFingerprint />
              </div>
              <h3>Reconhecimento Facial</h3>
              <p>Tecnologia avançada que identifica com precisão cada colaborador no quiosque da empresa.</p>
              <div className="feature-hover-effect"></div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaDesktop />
              </div>
              <h3>Quiosque Dedicado</h3>
              <p>Terminal exclusivo para registro de ponto localizado estrategicamente na empresa.</p>
              <div className="feature-hover-effect"></div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaChartLine />
              </div>
              <h3>Dashboard Personalizado</h3>
              <p>Painel individual para cada colaborador consultar seus registros de ponto e histórico.</p>
              <div className="feature-hover-effect"></div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <FaShieldAlt />
              </div>
              <h3>Controle Administrativo</h3>
              <p>Gerenciamento centralizado com recursos exclusivos para administradores do sistema.</p>
              <div className="feature-hover-effect"></div>
            </div>
          </div>

          <div className="wave-decoration inverted">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
              <path fill="#444444" fillOpacity="1" d="M0,128L48,149.3C96,171,192,213,288,218.7C384,224,480,192,576,165.3C672,139,768,117,864,122.7C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="how-works-section">
          <div className="section-header">
            <h2>Como Funciona</h2>
            <p>Um processo simples e seguro para controle de ponto</p>
          </div>

          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Cadastro Administrativo</h3>
              <p>O administrador cadastra os colaboradores e suas fotos para reconhecimento facial.</p>
            </div>
            
            <div className="step-connector desktop-only"></div>
            
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Registro no Quiosque</h3>
              <p>No dia a dia, o colaborador registra presença no quiosque instalado na empresa.</p>
            </div>
            
            <div className="step-connector desktop-only"></div>
            
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Acesso ao Dashboard</h3>
              <p>Cada colaborador pode acessar o sistema para visualizar seu histórico de registros.</p>
            </div>
          </div>

          <div className="wave-decoration">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
              <path fill="#333333" fillOpacity="1" d="M0,32L48,37.3C96,43,192,53,288,80C384,107,480,149,576,149.3C672,149,768,107,864,85.3C960,64,1056,64,1152,74.7C1248,85,1344,107,1392,117.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <div className="cta-content">
            <h2>Pronto para começar?</h2>
            <p>Escolha a opção conforme seu nível de acesso</p>
            
            <div className="cta-cards">
              <div className="cta-card">
                <div className="cta-icon"><FaUserCircle /></div>
                <h3>Para Colaboradores</h3>
                <p>Acesse seu dashboard pessoal para visualizar seus registros de ponto e histórico de frequência.</p>
                <Link to="/login" className="cta-button">
                  Acessar Dashboard <FaArrowRight className="btn-icon" />
                </Link>
              </div>
              
              <div className="cta-card highlight">
                <div className="cta-icon"><FaLock /></div>
                <h3>Área Administrativa</h3>
                <p>Acesso restrito para administradores gerenciarem o sistema, cadastros e registros de ponto.</p>
                <Link to="/registro" className="cta-button">
                  Área Restrita <FaArrowRight className="btn-icon" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img src="/logo.png" alt="FacePonto Logo" className="footer-logo-image" />
            <h3>FacePonto</h3>
            <p>Sistema corporativo de controle de ponto por reconhecimento facial</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Navegação</h4>
              <button onClick={() => scrollToSection('features')} className="footer-link">Recursos</button>
              <button onClick={() => scrollToSection('how-it-works')} className="footer-link">Como Funciona</button>
              <Link to="/login" className="footer-link">Acessar Sistema</Link>
            </div>
            
            <div className="footer-column">
              <h4>Contato</h4>
              <a href="mailto:contato@faceponto.com.br" className="footer-link">
                <FaEnvelope /> contato@faceponto.com.br
              </a>
              <a href="https://github.com/faceponto" target="_blank" rel="noopener noreferrer" className="footer-link">
                <FaGithub /> Github
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} FacePonto. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;