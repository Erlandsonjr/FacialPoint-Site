import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaSignOutAlt,
  FaPlus,
  FaSearch,
  FaKey, 
  FaSave,
  FaEye, 
  FaEyeSlash,
  FaCog,
} from "react-icons/fa";
import "./admin.css";

const API_BASE = "https://facialpoint-banco-dados-production.up.railway.app";

function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const navigate = useNavigate();
  
  const [showConfigSection, setShowConfigSection] = useState(false);
  const [kioskPassword, setKioskPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");

  useEffect(() => {
    fetchUsers();
    if (showConfigSection) {
      fetchCurrentPassword();
    }
  }, [showConfigSection]);

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
        `${API_BASE}/public/usuarios/completos`
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
  
  const fetchCurrentPassword = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      const response = await fetch(
        `${API_BASE}/config/senha-kiosk`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          setCurrentPassword("(Não definida)");
          return;
        }
        throw new Error(`Erro ao buscar senha atual: ${response.status}`);
      }
      
      const data = await response.json();
      setCurrentPassword(data.senha || "(Não definida)");
      
    } catch (error) {
      console.error("Erro ao buscar senha do quiosque:", error);
      setCurrentPassword("Erro ao buscar senha atual");
    }
  };
  
  const saveKioskPassword = async () => {
    if (!kioskPassword.trim() || kioskPassword.length < 4) {
      setPasswordMessage({ 
        text: "A senha deve ter pelo menos 4 caracteres", 
        type: "error" 
      });
      return;
    }
    
    try {
      setSavingPassword(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${API_BASE}/config/atualizar-senha-kiosk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ senha: kioskPassword })
        }
      );
      
      if (!response.ok) {
        throw new Error(`Erro ao salvar senha: ${response.status}`);
      }
      
      setPasswordMessage({ 
        text: "Senha do quiosque atualizada com sucesso!", 
        type: "success" 
      });
      setCurrentPassword(kioskPassword);
      setKioskPassword("");
      
      setTimeout(() => {
        setPasswordMessage({ text: "", type: "" });
      }, 3000);
      
    } catch (error) {
      console.error("Erro ao salvar senha:", error);
      setPasswordMessage({ 
        text: `Erro ao salvar senha: ${error.message}`, 
        type: "error" 
      });
    } finally {
      setSavingPassword(false);
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
            <img src="/logo.png" alt="FacialPoint" className="logo" />
            <h2>FacialPoint Admin</h2>
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
          <img src="/logo.png" alt="FacialPoint" className="logo" />
          <h2>FacialPoint Admin</h2>
        </div>

        <div className="admin-actions">
          <button className="config-button" onClick={() => setShowConfigSection(!showConfigSection)}>
            <FaCog /> Configurações
          </button>
          <button className="logout-button" onClick={handleLogout}>
            <FaSignOutAlt /> Sair
          </button>
        </div>
      </header>

      <main className="admin-content">
        {showConfigSection && (
          <div className="admin-config-panel">
            <div className="admin-panel-header">
              <h1>Configurações do Sistema</h1>
            </div>
            
            <div className="config-section">
              <h2><FaKey /> Configurar Senha do Quiosque</h2>
              <p>Configure a senha para acesso ao quiosque de registro de ponto.</p>
              
              <div className="current-password-section">
                <div className="current-password-label">Senha atual:</div>
                <div className="current-password-value">
                  {showPassword ? currentPassword : '••••••••'}
                  <button 
                    className="toggle-password-button" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>
              
              <div className="password-input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nova senha do quiosque"
                  value={kioskPassword}
                  onChange={(e) => setKioskPassword(e.target.value)}
                />
                <button 
                  className="save-password-button"
                  onClick={saveKioskPassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? "Salvando..." : <><FaSave /> Salvar</>}
                </button>
              </div>
              
              {passwordMessage.text && (
                <div className={`password-message ${passwordMessage.type}`}>
                  {passwordMessage.text}
                </div>
              )}
              
              <p className="password-info">
                Esta senha será solicitada para acessar o quiosque de registro de ponto.
                Recomendamos uma senha simples, mas que não seja facilmente adivinhada.
              </p>
            </div>
          </div>
        )}
      
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
