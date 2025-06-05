import React, { useState, useEffect } from 'react';
// teste de edição 
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaSignOutAlt, FaPlus, FaSearch, FaFilter } from 'react-icons/fa';
import './admin.css';

function Admin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    // Filtro de busca existente
    useEffect(() => {
        if (users.length > 0) {
            setFilteredUsers(
                users.filter(user => 
                    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                navigate('/');
                return;
            }

            const response = await fetch('https://faceponto-banco-dados-production.up.railway.app/usuarios/todos', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/');
                    return;
                }
                throw new Error('Falha ao carregar funcionários');
            }

            const data = await response.json();
            setUsers(data);
            setFilteredUsers(data);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = (userId) => {
        navigate(`/admin/funcionario/${userId}`);
    };

    const handleRegisterPoint = () => {
        navigate('/registro');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
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
                        <p className="loading-message">Carregando painel administrativo...</p>
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
                        <button className="register-point-button" onClick={handleRegisterPoint}>
                            <FaPlus /> Registrar Ponto
                        </button>
                    </div>
                    
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="search-section">
                        <div className="search-box">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Buscar funcionário por nome ou email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    <div className="users-list">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <div key={user._id} className="user-card" onClick={() => handleUserClick(user._id)}>
                                    <div className="user-avatar">
                                        {user.perfil ? (
                                            <img src={user.perfil} alt={user.nome} />
                                        ) : (
                                            <FaUserCircle />
                                        )}
                                    </div>
                                    <div className="user-info">
                                        <h3>{user.nome}</h3>
                                        <p>{user.email}</p>
                                        <span className="user-status">
                                            Status: {user.ativo ? "Ativo" : "Inativo"}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                {searchTerm ? "Nenhum funcionário corresponde à sua busca" : "Nenhum funcionário cadastrado"}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Admin;