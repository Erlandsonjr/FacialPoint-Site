import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaUserCircle,
  FaCalendarCheck,
  FaCalendarTimes,
  FaClock,
  FaExclamationCircle,
} from "react-icons/fa";
import "./UserDetails.css";

function UserDetails() {
  const [user, setUser] = useState(null);
  const [frequencias, setFrequencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const fetchUserDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/");
        return;
      }

      setLoading(true);

      const userResponse = await fetch(
        `https://faceponto-banco-dados-production.up.railway.app/usuarios/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          localStorage.removeItem("token");
          navigate("/");
          return;
        }
        throw new Error("Falha ao carregar detalhes do funcionário");
      }

      const userData = await userResponse.json();
      setUser(userData);

      const frequenciasResponse = await fetch(
        `https://faceponto-banco-dados-production.up.railway.app/frequencias/usuario/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!frequenciasResponse.ok) {
        throw new Error("Falha ao carregar frequências do funcionário");
      }

      const frequenciasData = await frequenciasResponse.json();
      setFrequencias(frequenciasData);
    } catch (error) {
      console.error("Erro ao buscar detalhes do usuário:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const goBack = () => {
    navigate("/admin");
  };

  if (loading) {
    return (
      <div className="user-details-container">
        <div className="user-details-loading">
          <div className="loading-spinner"></div>
          <p>Carregando detalhes do funcionário...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-details-container">
        <div className="user-details-error">
          <FaExclamationCircle />
          <h3>Erro ao carregar detalhes</h3>
          <p>{error}</p>
          <button onClick={goBack}>Voltar para lista de funcionários</button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-details-container">
      <header className="user-details-header">
        <button className="back-button" onClick={goBack}>
          <FaArrowLeft /> Voltar
        </button>
        <h2>Detalhes do Funcionário</h2>
      </header>

      <div className="user-details-content">
        <div className="user-profile">
          <div className="profile-header">
            <div className="profile-avatar">
              {user?.perfil ? (
                <img src={user.perfil} alt={user.nome} />
              ) : (
                <FaUserCircle />
              )}
            </div>
            <div className="profile-info">
              <h1>{user?.nome}</h1>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-status">
                Status:{" "}
                <span
                  className={user?.ativo ? "status-active" : "status-inactive"}
                >
                  {user?.ativo ? "Ativo" : "Inativo"}
                </span>
              </p>
            </div>
          </div>

          <div className="profile-details">
            <div className="details-section">
              <h3>Informações do Funcionário</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">ID:</span>
                  <span className="detail-value">{user?._id}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Função:</span>
                  <span className="detail-value">
                    {user?.role || "Funcionário"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Horário de Entrada:</span>
                  <span className="detail-value">
                    {user?.horario_entrada || "08:00"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Horário de Saída:</span>
                  <span className="detail-value">
                    {user?.horario_saida || "17:00"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="attendance-section">
          <h3>
            <FaCalendarCheck /> Registro de Frequências
          </h3>

          {frequencias.length > 0 ? (
            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {frequencias.map((freq) => (
                    <tr key={freq._id}>
                      <td>{formatDate(freq.data)}</td>
                      <td>{formatTime(freq.data)}</td>
                      <td>
                        <span
                          className={`badge ${
                            freq.tipo_registro === "entrada"
                              ? "badge-entry"
                              : "badge-exit"
                          }`}
                        >
                          {freq.tipo_registro === "entrada"
                            ? "Entrada"
                            : "Saída"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-attendance">
              <FaCalendarTimes />
              <p>Nenhum registro de ponto encontrado para este funcionário.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserDetails;
