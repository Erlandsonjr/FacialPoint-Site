import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaSignOutAlt,
  FaPlus,
  FaSearch,
} from "react-icons/fa";
import "./admin.css";

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0) {
      setFilteredUsers(
        users.filter((user) =>
          user.nome.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/public/usuarios/completos"
      );

      if (!response.ok) {
        throw new Error("Falha ao carregar funcionários");
      }

      const usersBasicInfo = await response.json();

      const formattedUsers = usersBasicInfo.map(user => ({
        _id: user.id,
        nome: user.nome,
        perfil: user.perfil,
      }));

      setUsers(formattedUsers);
      setFilteredUsers(formattedUsers);
    } catch (error) {
      setError("Erro ao carregar lista de funcionários. " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (userId) => {
    navigate(`/admin/funcionario/${userId}`);
  };

  const handleSingUp = () => {
    navigate("/cadastro");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="admin-container">
        <header className="admin-header">
          <div className="logo-container">
            <img src="/logo.png" alt="FacePonto" className="logo" />
            <h2>FacePonto Admin</h2>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-loading">
            <div className="loading-spinner"></div>
            <p className="loading-message">
              Carregando painel administrativo...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="logo-container">
          <img src="/logo.png" alt="FacePonto" className="logo" />
          <h2>FacePonto Admin</h2>
        </div>

        <div className="admin-actions">
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Sair
          </button>
        </div>
      </header>

      <main className="admin-content">
        <div className="admin-panel">
          <div className="admin-panel-header">
            <h1>Gerenciamento de Funcionários</h1>
            <button
              className="admin-singup-button"
              onClick={handleSingUp}
            >
              <FaPlus /> Cadastrar Funcionário
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="search-section">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Buscar funcionário por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="users-list">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="user-card"
                  onClick={() => handleUserClick(user._id)}
                >
                  <div className="user-avatar">
                    {user.perfil ? (
                      <img src={user.perfil} alt={user.nome} />
                    ) : (
                      <FaUserCircle />
                    )}
                  </div>
                  <div className="user-info">
                    <h3>{user.nome}</h3>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                {searchTerm
                  ? "Nenhum funcionário corresponde à sua busca"
                  : "Nenhum funcionário cadastrado"}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Admin;
