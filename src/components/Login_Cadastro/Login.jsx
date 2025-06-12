import { FaUser, FaLock } from "react-icons/fa";
import { useState } from "react";
import "./Login_Cadastro.css";
import { Link, useNavigate } from "react-router-dom";

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
        "https://faceponto-banco-dados-production.up.railway.app/usuarios/login",
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
        console.log("Login realizado com sucesso!");
        navigate(data.rota);
      }
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="page-container">
      <div className="app-header">
        <div className="logo-container">
          <img src="/logo.png" alt="FacePonto Logo" className="logo-image" />
        </div>
        <h1 className="app-title">FacePonto</h1>
      </div>

      <div className="container">
        {carregando && <div className="loading-overlay"></div>}

        <form onSubmit={handleSubmit}>
          <h1>Acesse o sistema</h1>

          {erro && <p className="erro">{erro}</p>}

          <div className="input-field">
            <input
              type="email"
              placeholder="E-mail"
              required
              onChange={(e) => setEmail(e.target.value)}
            />
            <FaUser className="icon" />
          </div>

          <div className="input-field">
            <input
              type="password"
              placeholder="Senha"
              required
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  );
};

export default Login;
