import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaUser, FaCalendarAlt, FaClock, FaEdit, FaCamera,
  FaSave, FaTimes, FaCheck, FaAngleDown, FaAngleUp, FaUpload, FaKey,
  FaTrash, FaExclamationTriangle, FaPlus
} from 'react-icons/fa';
import './userDetails.css';

const API_BASE = "https://faceponto-banco-dados-production.up.railway.app";

function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [frequencies, setFrequencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedUser, setEditedUser] = useState(null);
  const [weekDaysExpanded, setWeekDaysExpanded] = useState(true);
  const [frequencyFilters, setFrequencyFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    type: 'all'
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPhoto, setNewPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [passwordTab, setPasswordTab] = useState(false);
  const [photoTab, setPhotoTab] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showAddPoint, setShowAddPoint] = useState(false);
  const [manualPoint, setManualPoint] = useState({
    data: '',
    hora: '',
    tipo: 'entrada'
  });
  const [manualPointLoading, setManualPointLoading] = useState(false);
  const [manualPointError, setManualPointError] = useState('');
  const [manualPointSuccess, setManualPointSuccess] = useState('');

  useEffect(() => {
    fetchUserData();
    fetchUserFrequencies();
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/usuarios/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Erro ao carregar dados do funcionário: ${response.status}`);
      }
      const userData = await response.json();
      setUser(userData);
      setEditedUser({...userData});
      if (userData.perfil) {
        setPhotoPreview(userData.perfil);
      }
    } catch (error) {
      setError(`Erro ao carregar dados do usuário: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFrequencies = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/frequencias/usuario/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Erro ao carregar frequências: ${response.status}`);
      }
      const frequenciesData = await response.json();
      setFrequencies(frequenciesData);
    } catch (error) {}
  };

  const handleEditToggle = () => {
    if (editMode) {
      setEditedUser({...user});
      setNewPassword('');
      setConfirmPassword('');
      setNewPhoto(null);
      setPhotoName('');
      setPhotoTab(false);
      setPasswordTab(false);
      setValidationError(null);
    }
    setEditMode(!editMode);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser({
      ...editedUser,
      [name]: value
    });
  };

  const handleScheduleChange = (day, field, value) => {
    setEditedUser({
      ...editedUser,
      horarioTrabalho: {
        ...editedUser.horarioTrabalho,
        [day]: {
          ...editedUser.horarioTrabalho[day],
          [field]: value
        }
      }
    });
    setValidationError(null);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert("Por favor, selecione apenas imagens JPG ou PNG.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 5MB.");
        return;
      }
      setNewPhoto(file);
      setPhotoName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordToggle = () => {
    setPasswordTab(!passwordTab);
    if (photoTab) setPhotoTab(false);
  };

  const handlePhotoToggle = () => {
    setPhotoTab(!photoTab);
    if (passwordTab) setPasswordTab(false);
  };

  const validateSchedule = () => {
    if (!editedUser || !editedUser.horarioTrabalho) return "Horário de trabalho não está definido";
    const diasAtivos = Object.keys(editedUser.horarioTrabalho).filter(dia => 
      editedUser.horarioTrabalho[dia] &&
      editedUser.horarioTrabalho[dia].entrada &&
      editedUser.horarioTrabalho[dia].saida
    );
    if (diasAtivos.length === 0) {
      return "É necessário configurar pelo menos um dia de trabalho";
    }
    for (const dia of diasAtivos) {
      const entrada = editedUser.horarioTrabalho[dia].entrada;
      const saida = editedUser.horarioTrabalho[dia].saida;
      if (!entrada || !saida) continue;
      const [horaEntrada, minEntrada] = entrada.split(':').map(Number);
      const [horaSaida, minSaida] = saida.split(':').map(Number);
      const entradaMin = horaEntrada * 60 + minEntrada;
      const saidaMin = horaSaida * 60 + minSaida;
      if (entradaMin >= saidaMin) {
        return `No dia ${dia.charAt(0).toUpperCase() + dia.slice(1)}, o horário de entrada deve ser antes do horário de saída`;
      }
      if (saidaMin - entradaMin < 15) {
        return `No dia ${dia.charAt(0).toUpperCase() + dia.slice(1)}, o horário de saída deve ter pelo menos 15 minutos de diferença do horário de entrada`;
      }
    }
    return null;
  };

  const validateChanges = () => {
    setValidationError(null);
    if (passwordTab) {
      if (newPassword && newPassword.length < 3) {
        setValidationError("A senha deve ter pelo menos 3 caracteres.");
        return false;
      }
      if (newPassword !== confirmPassword) {
        setValidationError("As senhas não coincidem.");
        return false;
      }
    }
    const scheduleError = validateSchedule();
    if (scheduleError) {
      setValidationError(scheduleError);
      return false;
    }
    return true;
  };

  const processPhotoUpdate = async () => {
    if (!newPhoto) return null;
    try {
      setProcessingPhoto(true);
      const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };
      const photoBase64 = await convertToBase64(newPhoto);
      const formData = new FormData();
      formData.append("file", newPhoto);
      const codificacaoResponse = await fetch(
        "https://gerarcodificacaofaceponto-production.up.railway.app/gerar-codificacao",
        {
          method: "POST",
          body: formData,
        }
      );
      if (!codificacaoResponse.ok) {
        throw new Error(`Erro ao processar foto (${codificacaoResponse.status})`);
      }
      const responseData = await codificacaoResponse.json();
      let codificacao;
      if (Array.isArray(responseData)) {
        codificacao = responseData;
      } else if (responseData.codificacao) {
        codificacao = responseData.codificacao;
      } else if (responseData.data) {
        codificacao = responseData.data;
      } else {
        throw new Error("Formato de resposta inválido da API de codificação.");
      }
      return {
        fotoCodificacao: codificacao,
        fotoPerfil: photoBase64
      };
    } catch (error) {
      setValidationError(`Erro ao processar a foto: ${error.message}`);
      return null;
    } finally {
      setProcessingPhoto(false);
    }
  };

  const handleSaveUser = async () => {
    if (!validateChanges()) return;
    try {
      const token = localStorage.getItem('token');
      const updateData = {
        nome: editedUser.nome,
        email: editedUser.email,
        horarioTrabalho: editedUser.horarioTrabalho
      };
      if (passwordTab && newPassword) {
        updateData.senha = newPassword;
      }
      if (photoTab && newPhoto) {
        const photoData = await processPhotoUpdate();
        if (!photoData) return;
        updateData.foto = photoData.fotoCodificacao;
        updateData.perfil = photoData.fotoPerfil;
      }
      const response = await fetch(`${API_BASE}/usuarios/admin/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });
      if (!response.ok) {
        throw new Error(`Erro ao atualizar dados: ${response.status}`);
      }
      const updatedUser = await response.json();
      setUser(updatedUser);
      setEditMode(false);
      setPasswordTab(false);
      setPhotoTab(false);
      setValidationError(null);
      alert('Dados atualizados com sucesso!');
    } catch (error) {
      setValidationError(`Erro ao salvar alterações: ${error.message}`);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setDeleteLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/usuarios/admin/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Erro ao excluir usuário: ${response.status}`);
      }
      alert('Funcionário excluído com sucesso!');
      navigate('/admin/dashboard');
    } catch (error) {
      setValidationError(`Erro ao excluir funcionário: ${error.message}`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const renderScheduleInputs = () => {
    if (!user || !user.horarioTrabalho) return null;
    const days = [
      { id: 'domingo', label: 'Domingo' },
      { id: 'segunda', label: 'Segunda' },
      { id: 'terca', label: 'Terça' },
      { id: 'quarta', label: 'Quarta' },
      { id: 'quinta', label: 'Quinta' },
      { id: 'sexta', label: 'Sexta' },
      { id: 'sabado', label: 'Sábado' },
    ];
    return days.map((day) => (
      <div key={day.id} className="schedule-day">
        <div className="day-name">{day.label}</div>
        <div className="day-inputs">
          {editMode ? (
            <>
              <input
                type="time"
                value={editedUser.horarioTrabalho[day.id]?.entrada || ''}
                onChange={(e) => handleScheduleChange(day.id, 'entrada', e.target.value)}
              />
              <span className="time-separator">até</span>
              <input
                type="time"
                value={editedUser.horarioTrabalho[day.id]?.saida || ''}
                onChange={(e) => handleScheduleChange(day.id, 'saida', e.target.value)}
              />
            </>
          ) : (
            <>
              <div className="time-display">
                {user.horarioTrabalho[day.id]?.entrada || '--:--'}
              </div>
              <span className="time-separator">até</span>
              <div className="time-display">
                {user.horarioTrabalho[day.id]?.saida || '--:--'}
              </div>
            </>
          )}
        </div>
      </div>
    ));
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const filterFrequencies = () => {
    if (!frequencies.length) return [];
    return frequencies.filter(freq => {
      const freqDate = new Date(freq.data);
      const startDate = new Date(frequencyFilters.startDate);
      const endDate = new Date(frequencyFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      const inDateRange = freqDate >= startDate && freqDate <= endDate;
      if (frequencyFilters.type === 'all') {
        return inDateRange;
      }
      return inDateRange && freq.tipo_registro === frequencyFilters.type;
    });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFrequencyFilters({
      ...frequencyFilters,
      [name]: value
    });
  };

  const handleAddPointChange = (e) => {
    const { name, value } = e.target;
    if (name === "data") {
      let v = value.replace(/\D/g, "");
      if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
      if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5, 9);
      if (v.length > 10) v = v.slice(0, 10);
      setManualPoint({ ...manualPoint, [name]: v });
    } else {
      setManualPoint({ ...manualPoint, [name]: value });
    }
    setManualPointError('');
    setManualPointSuccess('');
  };

  const handleAddPoint = async (e) => {
    e.preventDefault();
    setManualPointError('');
    setManualPointSuccess('');
    if (!manualPoint.data || !manualPoint.hora || !manualPoint.tipo) {
      setManualPointError('Preencha todos os campos.');
      return;
    }
    const dataParts = manualPoint.data.split('/');
    if (dataParts.length !== 3) {
      setManualPointError('Data inválida. Use o formato dd/mm/aaaa.');
      return;
    }
    const [dia, mes, ano] = dataParts;
    const dataISO = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${manualPoint.hora}:00-03:00`;
    setManualPointLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/frequencias/manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: id,
          nome: user.nome,
          data: dataISO,
          tipo_registro: manualPoint.tipo
        })
      });
      if (!response.ok) {
        const res = await response.json();
        setManualPointError(res.erro || 'Erro ao adicionar ponto.');
        setManualPointLoading(false);
        return;
      }
      setManualPointSuccess('Ponto adicionado com sucesso!');
      setManualPoint({ data: '', hora: '', tipo: 'entrada' });
      setShowAddPoint(false);
      fetchUserFrequencies();
    } catch (err) {
      setManualPointError('Erro ao adicionar ponto.');
    } finally {
      setManualPointLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="user-details-container">
        <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
          <FaArrowLeft /> Voltar
        </button>
        <div className="loading-spinner"></div>
        <p className="loading-message">Carregando dados do funcionário...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-details-container">
        <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
          <FaArrowLeft /> Voltar
        </button>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="user-details-container">
      <button className="back-button" onClick={() => navigate('/admin/dashboard')}>
        <FaArrowLeft /> Voltar
      </button>
      <div className="user-details-header">
        <h1>Detalhes do Funcionário</h1>
      </div>
      <div className="edit-button-row">
        <button 
          className={editMode ? "cancel-button" : "edit-button"} 
          onClick={handleEditToggle}
        >
          {editMode ? <><FaTimes /> Cancelar</> : <><FaEdit /> Editar</>}
        </button>
      </div>
      {user && (
        <div className="user-details-content">
          <div className="user-profile-section">
            <div className="user-avatar-large">
              {photoPreview ? (
                <img src={photoPreview} alt={user.nome} />
              ) : (
                <FaUser className="default-avatar" />
              )}
            </div>
            <div className="user-info-fields">
              <div className="info-field">
                <label>Nome:</label>
                {editMode ? (
                  <input
                    type="text"
                    name="nome"
                    value={editedUser.nome}
                    onChange={handleInputChange}
                  />
                ) : (
                  <span>{user.nome}</span>
                )}
              </div>
              <div className="info-field">
                <label>Email:</label>
                {editMode ? (
                  <input
                    type="email"
                    name="email"
                    value={editedUser.email}
                    onChange={handleInputChange}
                  />
                ) : (
                  <span>{user.email}</span>
                )}
              </div>
              
              {editMode && (
                <div className="edit-additional-options">
                  <button 
                    className={`option-button ${passwordTab ? 'option-active' : ''}`}
                    onClick={handlePasswordToggle}
                  >
                    <FaKey /> Alterar senha
                  </button>
                  
                  <button 
                    className={`option-button ${photoTab ? 'option-active' : ''}`}
                    onClick={handlePhotoToggle}
                  >
                    <FaCamera /> Alterar foto
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="schedule-section">
            <div className="section-header" onClick={() => setWeekDaysExpanded(!weekDaysExpanded)}>
              <h2><FaClock /> Horário de Trabalho</h2>
              {weekDaysExpanded ? <FaAngleUp /> : <FaAngleDown />}
            </div>
            {weekDaysExpanded && (
              <div className="week-schedule">
                {renderScheduleInputs()}
              </div>
            )}
          </div>
          {validationError && (
            <div className="validation-error-message">
              {validationError}
            </div>
          )}
          {editMode && passwordTab && (
            <div className="password-edit-section">
              <h3>Alterar senha</h3>
              <div className="password-fields">
                <div className="password-field">
                  <label>Nova senha:</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha"
                  />
                </div>
                <div className="password-field">
                  <label>Confirmar nova senha:</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                  />
                </div>
              </div>
            </div>
          )}

          {editMode && photoTab && (
            <div className="photo-edit-section">
              <h3>Alterar foto</h3>
              <div className="photo-upload-container">
                <div className="current-photo">
                  <h4>Foto atual</h4>
                  <div className="photo-preview current">
                    {user.perfil ? (
                      <img src={user.perfil} alt={user.nome} />
                    ) : (
                      <div className="no-photo">
                        <FaUser size={40} />
                        <span>Sem foto</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="new-photo">
                  <h4>Nova foto</h4>
                  <input
                    id="newPhoto"
                    type="file"
                    accept="image/jpeg, image/png"
                    onChange={handlePhotoChange}
                    className="hidden-input"
                  />
                  <label htmlFor="newPhoto" className="photo-upload-label">
                    {newPhoto ? (
                      <div className="photo-preview">
                        <img src={photoPreview} alt="Nova foto" />
                        <div className="photo-overlay">
                          <FaUpload />
                          <span>Trocar</span>
                        </div>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <FaUpload size={30} />
                        <span>Selecionar foto</span>
                      </div>
                    )}
                  </label>
                  {photoName && (
                    <div className="photo-name">{photoName}</div>
                  )}
                </div>
              </div>
              <p className="photo-instructions">
                Para melhores resultados de reconhecimento facial: boa iluminação, 
                rosto centralizado e sem acessórios que cubram partes do rosto.
              </p>
            </div>
          )}

          {editMode && (
            <div className="edit-actions">
              <button 
                className="save-button" 
                onClick={handleSaveUser}
                disabled={processingPhoto}
              >
                {processingPhoto ? 'Processando...' : <><FaSave /> Salvar Alterações</>}
              </button>
            </div>
          )}

          <div className="frequencies-section">
            <div className="section-header">
              <h2><FaCalendarAlt /> Histórico de Ponto</h2>
            </div>
            <button
              className="add-point-button"
              onClick={() => setShowAddPoint(!showAddPoint)}
              style={{ marginBottom: '12px' }}
            >
              <FaPlus /> Adicionar Ponto Manualmente
            </button>
            {showAddPoint && (
              <form className="add-point-form" onSubmit={handleAddPoint}>
                <div className="add-point-fields">
                  <input
                    type="text"
                    name="data"
                    placeholder="dd/mm/aaaa"
                    value={manualPoint.data}
                    onChange={handleAddPointChange}
                    pattern="\d{2}/\d{2}/\d{4}"
                    maxLength={10}
                  />
                  <input
                    type="time"
                    name="hora"
                    value={manualPoint.hora}
                    onChange={handleAddPointChange}
                  />
                  <select
                    name="tipo"
                    value={manualPoint.tipo}
                    onChange={handleAddPointChange}
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                  <button
                    type="submit"
                    className="save-point-button"
                    disabled={manualPointLoading}
                  >
                    {manualPointLoading ? 'Salvando...' : <><FaSave /> Salvar</>}
                  </button>
                </div>
                {manualPointError && (
                  <div className="manual-point-error">{manualPointError}</div>
                )}
                {manualPointSuccess && (
                  <div className="manual-point-success">{manualPointSuccess}</div>
                )}
              </form>
            )}
            
            <div className="frequency-filters">
              <div className="filter-group">
                <label>Data Inicial:</label>
                <input
                  type="date"
                  name="startDate"
                  value={frequencyFilters.startDate}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Data Final:</label>
                <input
                  type="date"
                  name="endDate"
                  value={frequencyFilters.endDate}
                  onChange={handleFilterChange}
                />
              </div>
              
              <div className="filter-group">
                <label>Tipo:</label>
                <select 
                  name="type"
                  value={frequencyFilters.type}
                  onChange={handleFilterChange}
                >
                  <option value="all">Todos</option>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
            </div>
            
            <div className="frequencies-list">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Hora</th>
                    <th>Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {filterFrequencies().length > 0 ? (
                    filterFrequencies().map((freq, index) => (
                      <tr key={index}>
                        <td>{formatDate(freq.data)}</td>
                        <td>{formatTime(freq.data)}</td>
                        <td className={`frequency-type ${freq.tipo_registro}`}>
                          {freq.tipo_registro === 'entrada' ? (
                            <>Entrada <FaCheck className="type-icon entrada" /></>
                          ) : (
                            <>Saída <FaCheck className="type-icon saida" /></>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="no-records">
                        Nenhum registro encontrado para este período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="delete-section">
            <button 
              className="delete-button"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <FaTrash /> Excluir Funcionário
            </button>
            <p className="delete-warning">
              Esta ação não pode ser desfeita. Todos os dados do funcionário serão removidos do sistema.
            </p>
          </div>

          {showDeleteConfirm && (
            <div className="delete-modal-overlay">
              <div className="delete-modal">
                <div className="delete-modal-header">
                  <FaExclamationTriangle className="delete-warning-icon" />
                  <h3>Confirmar Exclusão</h3>
                </div>
                <div className="delete-modal-body">
                  <p>Você está prestes a excluir permanentemente o funcionário <strong>{user.nome}</strong>.</p>
                  <p>Todos os registros de ponto e dados cadastrais serão perdidos.</p>
                  <p>Tem certeza que deseja continuar?</p>
                </div>
                <div className="delete-modal-footer">
                  <button 
                    className="cancel-delete-button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="confirm-delete-button"
                    onClick={handleDeleteUser}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserDetails;