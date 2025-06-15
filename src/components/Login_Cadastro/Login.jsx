import { FaUser, FaLock, FaArrowRight } from "react-icons/fa";
import { useState } from "react";
import "./Login_Cadastro.css";
import { Link, useNavigate } from "react-router-dom";

const API_BASE = "https://faceponto-banco-dados-production.up.railway.app";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const response = await fetch(
        `${API_BASE}/usuarios/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, senha }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.erro || "Erro ao realizar login");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
        navigate(data.rota);
      }
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-page-container-clean">
      <div className="login-header">
        <Link to="/" className="login-logo-link">
          <div className="login-logo-container">
            <img src="/logo.png" alt="FacePonto Logo" className="login-logo" />
          </div>
          <h1 className="login-title">FacePonto</h1>
        </Link>
      </div>

      <div className="login-content-wrapper">
        <div className={`login-form-container ${carregando ? "login-loading" : ""}`}>
          <div className="login-form-header">
            <h2>Acesso ao <span className="highlight">Sistema</span></h2>
            <p className="login-subtitle">
              Entre com suas credenciais para acessar seu dashboard pessoal
            </p>
          </div>

          {erro && <div className="login-error-message">{erro}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-input-group">
              <label htmlFor="email">E-mail</label>
              <div className="login-input-field">
                <FaUser className="login-input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="Seu e-mail corporativo"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="login-input-group">
              <label htmlFor="senha">Senha</label>
              <div className="login-input-field">
                <FaLock className="login-input-icon" />
                <input
                  id="senha"
                  type="password"
                  placeholder="Sua senha"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
            </div>

            <div className="login-button-container">
              <button type="submit" className="login-button">
                Entrar <FaArrowRight className="login-button-icon" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
