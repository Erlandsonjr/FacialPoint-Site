import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaLock, FaArrowRight, FaExclamationTriangle, FaArrowLeft } from 'react-icons/fa';
import './kioskAuth.css';

const API_BASE = "https://faceponto-banco-dados-production.up.railway.app";

function KioskAuth() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Digite a senha para continuar');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/config/verificar-senha-kiosk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ senha: password })
      });
      if (!response.ok) {
        throw new Error('Senha incorreta');
      }
      localStorage.setItem('kioskAuth', 'true');
      localStorage.setItem('kioskAuthTime', Date.now().toString());
      navigate('/registro');
    } catch (error) {
      setError('Senha incorreta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="kiosk-auth-container">
      <div className="kiosk-auth-header">
        <img src="/logo.png" alt="FacePonto" className="kiosk-logo" />
        <h1>FacePonto</h1>
      </div>
      <button
        className="kiosk-back-button"
        onClick={() => navigate('/')}
        type="button"
      >
        <FaArrowLeft /> Voltar
      </button>
      <div className="kiosk-auth-content">
        <div className="kiosk-auth-card">
          <div className="kiosk-auth-icon">
            <FaLock />
          </div>
          <h2>Insira a senha do quiosque</h2>
          <p>Digite a senha para acessar o sistema de registro de ponto</p>
          <form onSubmit={handleSubmit}>
            <div className="kiosk-auth-form">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
                autoFocus
              />
              <button 
                type="submit" 
                className="kiosk-auth-button"
                disabled={loading}
              >
                {loading ? 'Verificando...' : <FaArrowRight />}
              </button>
            </div>
            {error && (
              <div className="kiosk-auth-error">
                <FaExclamationTriangle /> {error}
              </div>
            )}
          </form>
        </div>
      </div>
      <div className="kiosk-auth-footer">
        © {new Date().getFullYear()} FacePonto - Sistema de Reconhecimento Facial
      </div>
    </div>
  );
}

export default KioskAuth;