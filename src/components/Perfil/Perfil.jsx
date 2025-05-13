import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUser, FaCamera, FaArrowLeft, FaCheck, FaEdit, FaSave, FaIdCard } from 'react-icons/fa';
import './perfil.css';
import LoadingSpinner from '../Login_Cadastro/LoadingSpinner';

function Perfil() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [novaFoto, setNovaFoto] = useState(null);
  const [previewFoto, setPreviewFoto] = useState(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState(''); // Adicionado estado para CPF
  const [temFotoReferencia, setTemFotoReferencia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState('');
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/');
          return;
        }
        
        try {
          console.log("Buscando dados do usuário...");
          const userResponse = await fetch(
            `https://faceponto-banco-dados-production.up.railway.app/usuarios/me`, 
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log("Dados do usuário recebidos:", userData);
            setUserData(userData);
            setNome(userData.nome || '');
            setEmail(userData.email || '');
            setCpf(userData.cpf || ''); // Armazenar o CPF
            
            // Verificar se o usuário tem uma foto de referência
            setTemFotoReferencia(!!userData.foto);
          } else {
            throw new Error('Erro ao buscar dados do usuário');
          }
        } catch (error) {
          console.error("Erro ao buscar dados de usuário:", error);
          setError('Não foi possível carregar seus dados. Por favor, tente novamente.');
        }
      } catch (error) {
        console.error('Erro:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [navigate]);
  
  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNovaFoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewFoto(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleEditarFoto = () => {
    fileInputRef.current.click();
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setError('');
    setSucesso('');
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/');
        return;
      }
      
      console.log("Atualizando dados do usuário:", { nome, email });
      
      // Primeiro, salva os dados básicos (nome, email)
      const dadosAtualizados = {
        nome,
        email
      };
      
      try {
        const updateResponse = await fetch(
          'https://faceponto-banco-dados-production.up.railway.app/usuarios', // Remova o /me
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosAtualizados)
          }
        );
        
        console.log("Resposta da atualização:", updateResponse.status);
        
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error("Erro na resposta:", errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { erro: errorText || "Erro desconhecido" };
          }
          throw new Error(errorData.erro || `Erro ao atualizar dados (${updateResponse.status})`);
        }
      } catch (error) {
        console.error("Erro na atualização de perfil:", error);
        throw error;
      }
      
      // Se tem uma nova foto, atualiza a codificação facial
      if (novaFoto) {
        try {
          const formData = new FormData();
          formData.append("file", novaFoto);
          
          console.log("Enviando foto para gerar codificação...");
          const codificacaoResponse = await fetch(
            "https://gerarcodificacaofaceponto-production.up.railway.app/gerar-codificacao",
            {
              method: "POST",
              body: formData,
            }
          );
  
          if (!codificacaoResponse.ok) {
            const errorText = await codificacaoResponse.text();
            console.error("Erro na geração de codificação:", errorText);
            throw new Error("Erro ao processar a foto. Verifique se há um rosto claro na imagem.");
          }
  
          const codificacao = await codificacaoResponse.json();
          console.log("Codificação gerada com sucesso");
          
          // Atualiza a foto no servidor
          const fotoUpdateResponse = await fetch(
            'https://faceponto-banco-dados-production.up.railway.app/usuarios/me/foto', 
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ foto: codificacao })
            }
          );
          
          if (!fotoUpdateResponse.ok) {
            const errorText = await fotoUpdateResponse.text();
            console.error("Erro na atualização da foto:", errorText);
            let errorData;
            try {
              errorData = JSON.parse(errorText);
            } catch (e) {
              errorData = { erro: errorText || "Erro desconhecido" };
            }
            throw new Error(errorData.erro || 'Erro ao atualizar foto de referência');
          }
        } catch (error) {
          console.error("Erro no processo de foto:", error);
          throw error;
        }
      }
      
      // Recarregar dados do usuário
      const refreshUserResponse = await fetch(
        'https://faceponto-banco-dados-production.up.railway.app/usuarios/me', 
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (refreshUserResponse.ok) {
        const userData = await refreshUserResponse.json();
        setUserData(userData);
        setNome(userData.nome || '');
        setEmail(userData.email || '');
        setCpf(userData.cpf || ''); // Atualizar o CPF
        setTemFotoReferencia(!!userData.foto);
      }
      
      setSucesso('Perfil atualizado com sucesso!');
      setEditMode(false);
      setNovaFoto(null);
      setPreviewFoto(null);
      
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setError(error.message || "Ocorreu um erro durante a atualização do perfil");
    } finally {
      setSalvando(false);
    }
  };

  // Função para formatar CPF
  const formatarCpf = (cpf) => {
    if (!cpf) return '';
    // Remove caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    // Aplica a formatação
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (loading) return (
    <div className="perfil-loading">
      <div className="loading-spinner"></div>
      <p>Carregando seu perfil...</p>
    </div>
  );

  return (
    <div className="perfil-container">
      {salvando && <LoadingSpinner message="Salvando alterações..." />}
      
      <header className="perfil-header">
        <Link to="/funcionario/dashboard" className="voltar-button">
          <FaArrowLeft /> Voltar
        </Link>
        <h1>Seu Perfil</h1>
      </header>
      
      <div className="perfil-content">
        {error && <div className="erro-message"><p>{error}</p></div>}
        {sucesso && <div className="sucesso-message"><FaCheck /> {sucesso}</div>}
        
        <div className="referencia-foto-container">
          <div className="referencia-foto-wrapper">
            {previewFoto ? (
              <img src={previewFoto} alt="Nova foto de referência" className="referencia-foto" />
            ) : (
              <div className="referencia-foto-placeholder">
                <FaIdCard size={60} />
                {temFotoReferencia ? (
                  <span className="referencia-status">Foto de referência cadastrada</span>
                ) : (
                  <span className="referencia-status">Nenhuma foto cadastrada</span>
                )}
              </div>
            )}
            {editMode && (
              <button className="editar-foto-button" onClick={handleEditarFoto}>
                <FaCamera />
              </button>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFotoChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
        
        <form className="perfil-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={!editMode}
              className={editMode ? "editable" : ""}
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!editMode}
              className={editMode ? "editable" : ""}
            />
          </div>
          
          {/* Novo campo para CPF (somente visualização) */}
          <div className="form-group">
            <label>CPF</label>
            <input
              type="text"
              value={formatarCpf(cpf)}
              disabled={true}
              className="readonly"
            />
          </div>
          
          <div className="form-actions">
            {editMode ? (
              <>
                <button type="submit" className="salvar-button">
                  <FaSave /> Salvar alterações
                </button>
                <button 
                  type="button" 
                  className="cancelar-button"
                  onClick={() => {
                    setEditMode(false);
                    setNome(userData.nome || '');
                    setEmail(userData.email || '');
                    setNovaFoto(null);
                    setPreviewFoto(null);
                  }}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button 
                type="button" 
                className="editar-button"
                onClick={() => setEditMode(true)}
              >
                <FaEdit /> Editar perfil
              </button>
            )}
          </div>
        </form>
        
        <div className="perfil-info">
          <p>A foto de referência é utilizada para reconhecimento facial no registro de ponto. Não é exibida publicamente.</p>
          {temFotoReferencia ? (
            <p className="info-status success">✓ Você tem uma foto de referência cadastrada</p>
          ) : (
            <p className="info-status warning">⚠️ Cadastre uma foto de referência para usar o reconhecimento facial</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Perfil;