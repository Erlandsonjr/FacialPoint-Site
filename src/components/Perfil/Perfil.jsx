import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaArrowLeft, FaCheck, FaIdCard } from "react-icons/fa";
import "./perfil.css";
import LoadingSpinner from "../Login_Cadastro/LoadingSpinner";

function Perfil() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [temFotoReferencia, setTemFotoReferencia] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/");
          return;
        }

        try {
          console.log("Buscando dados do usuário...");
          const userResponse = await fetch(
            `https://faceponto-banco-dados-production.up.railway.app/usuarios/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log("Dados do usuário recebidos:", userData);
            setUserData(userData);
            setNome(userData.nome || "");
            setEmail(userData.email || "");

            setTemFotoReferencia(!!userData.foto);
          } else {
            throw new Error("Erro ao buscar dados do usuário");
          }
        } catch (error) {
          console.error("Erro ao buscar dados de usuário:", error);
          setError(
            "Não foi possível carregar seus dados. Por favor, tente novamente."
          );
        }
      } catch (error) {
        console.error("Erro:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  if (loading)
    return (
      <div className="perfil-loading">
        <div className="loading-spinner"></div>
        <p>Carregando seu perfil...</p>
      </div>
    );

  return (
    <div className="perfil-container">
      <header className="perfil-header">
        <Link to="/funcionario/dashboard" className="voltar-button">
          <FaArrowLeft /> Voltar
        </Link>
        <h1>Seu Perfil</h1>
      </header>

      <div className="perfil-content">
        {error && (
          <div className="erro-message">
            <p>{error}</p>
          </div>
        )}

        <div className="referencia-foto-container">
          <div className="referencia-foto-wrapper">
            {temFotoReferencia && userData.perfil ? (
              <img
                src={userData.perfil}
                alt="Foto de referência"
                className="referencia-foto"
              />
            ) : (
              <div className="referencia-foto-placeholder">
                <FaIdCard size={60} />
                <span className="referencia-status">
                  Nenhuma foto cadastrada
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="perfil-form">
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              value={nome}
              disabled={true}
              className="readonly"
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              disabled={true}
              className="readonly"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Perfil;
