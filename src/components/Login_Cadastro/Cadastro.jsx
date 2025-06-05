import React, { useState, useEffect } from "react";
import { 
  FaUser, FaEnvelope, FaLock, FaCheckCircle, FaClock, 
  FaArrowRight, FaArrowLeft, FaUpload, FaCalendarAlt, 
  FaCheck, FaTimes
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./Login_Cadastro.css";
import LoadingSpinner from "./LoadingSpinner"; 
import ReactDOM from 'react-dom'; 

function Cadastro() {
    // Estados existentes
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [foto, setFoto] = useState(null);
    const [erro, setErro] = useState("");
    const [sucesso, setSucesso] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [fotoNome, setFotoNome] = useState("");
    const [horariosSemana, setHorariosSemana] = useState({
        domingo: { ativo: false, entrada: "08:00", saida: "17:00" },
        segunda: { ativo: true, entrada: "08:00", saida: "17:00" },
        terca: { ativo: true, entrada: "08:00", saida: "17:00" },
        quarta: { ativo: true, entrada: "08:00", saida: "17:00" },
        quinta: { ativo: true, entrada: "08:00", saida: "17:00" },
        sexta: { ativo: true, entrada: "08:00", saida: "17:00" },
        sabado: { ativo: false, entrada: "08:00", saida: "17:00" },
    });

    // Estado para gerenciar o processo em etapas
    const [etapaAtual, setEtapaAtual] = useState(0);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [diasAgrupados, setDiasAgrupados] = useState(true); // Para agrupar dias de semana
    
    const navigate = useNavigate();

    // Funções existentes para manipulação de horários
    const toggleDiaAtivo = (dia) => {
        setHorariosSemana({
            ...horariosSemana,
            [dia]: {
                ...horariosSemana[dia],
                ativo: !horariosSemana[dia].ativo
            }
        });
    };

    const ajustarHorario = (dia, tipo, valor) => {
        const [horas, minutos] = valor.split(':');
        
        setHorariosSemana({
            ...horariosSemana,
            [dia]: {
                ...horariosSemana[dia],
                [tipo]: `${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}`
            }
        });
    };

    // Verificar se todos dias úteis têm os mesmos horários
    const verificarHorariosIguais = () => {
        const diasUteis = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
        const primeiroHorario = horariosSemana['segunda'];
        
        return diasUteis.every(dia => 
            horariosSemana[dia].entrada === primeiroHorario.entrada && 
            horariosSemana[dia].saida === primeiroHorario.saida &&
            horariosSemana[dia].ativo === primeiroHorario.ativo
        );
    };

    // Aplicar o mesmo horário a todos os dias úteis
    const aplicarHorariosTodosDiasUteis = (entrada, saida) => {
        const diasUteis = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
        const novosHorarios = { ...horariosSemana };
        
        diasUteis.forEach(dia => {
            novosHorarios[dia] = {
                ...novosHorarios[dia],
                entrada: entrada,
                saida: saida,
                ativo: true
            };
        });
        
        setHorariosSemana(novosHorarios);
    };
    
    // Aplicar alteração em dias específicos
    const aplicarHorariosDiasEspecificos = (dias, entrada, saida, ativo) => {
        const novosHorarios = { ...horariosSemana };
        
        dias.forEach(dia => {
            novosHorarios[dia] = {
                ...novosHorarios[dia],
                entrada: entrada || novosHorarios[dia].entrada,
                saida: saida || novosHorarios[dia].saida,
                ativo: ativo !== undefined ? ativo : novosHorarios[dia].ativo
            };
        });
        
        setHorariosSemana(novosHorarios);
    };

    // Validação de etapa
    const validarEtapa = () => {
        switch(etapaAtual) {
            case 0: // Informações pessoais
                if (!username.trim()) return "Nome é obrigatório";
                if (!email.trim()) return "E-mail é obrigatório";
                if (!email.includes('@') || !email.includes('.')) return "E-mail inválido";
                if (senha.length < 3) return "Senha deve ter pelo menos 3 caracteres";
                if (senha !== confirmarSenha) return "As senhas não coincidem";
                return null;
                
            case 1: // Foto
                if (!foto) return "Por favor, selecione uma foto";
                return null;
                
            case 2: // Horários
                const algumDiaAtivo = Object.values(horariosSemana).some(dia => dia.ativo);
                if (!algumDiaAtivo) return "Selecione pelo menos um dia de trabalho";
                return null;
                
            default:
                return null;
        }
    };

    // Funções para navegação entre etapas
    const irParaProximaEtapa = () => {
        const erro = validarEtapa();
        if (erro) {
            setErro(erro);
            return;
        }
        
        setErro("");
        setEtapaAtual(etapaAtual + 1);
    };
    
    const voltarEtapa = () => {
        setErro("");
        setEtapaAtual(etapaAtual - 1);
    };

    // Tratar upload de foto
    const handleFotoChange = (e) => {
        const arquivo = e.target.files[0];
        if (arquivo) {
            // Verificar tipo de arquivo
            if (!arquivo.type.includes('image/')) {
                setErro("Por favor, selecione apenas arquivos de imagem.");
                return;
            }
            
            // Verificar tamanho máximo (5MB)
            if (arquivo.size > 5 * 1024 * 1024) {
                setErro("A imagem deve ter no máximo 5MB.");
                return;
            }
            
            setFoto(arquivo);
            setFotoNome(arquivo.name);
            
            // Gerar preview
            const reader = new FileReader();
            reader.onload = (e) => setFotoPreview(e.target.result);
            reader.readAsDataURL(arquivo);
            
            setErro(""); // Limpar mensagens de erro anteriores
        }
    };

    // Função para verificar se um horário é válido para envio à API
    const isHorarioValido = (entrada, saida) => {
        return entrada && saida && entrada.trim() !== "" && saida.trim() !== "";
    };

    // Envio do formulário
    const handleSubmit = async (event) => {
        event.preventDefault();
        
        // Validação da última etapa
        const erro = validarEtapa();
        if (erro) {
            setErro(erro);
            return;
        }
        
        setErro("");
        setCarregando(true);

        try {
            // Converter a foto para Base64
            const convertToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });
            };

            const fotoBase64 = await convertToBase64(foto);
            
            // Processar a codificação facial
            const formData = new FormData();
            formData.append("file", foto);
            
            console.log("Enviando foto para processamento...");
            
            const responseCodificacao = await fetch(
                "https://gerarcodificacaofaceponto-production.up.railway.app/gerar-codificacao",
                {
                    method: "POST",
                    body: formData
                }
            );

            if (!responseCodificacao.ok) {
                const errorStatus = responseCodificacao.status;
                let errorMsg = `Erro ao processar foto (${errorStatus})`;
                
                try {
                    const errorData = await responseCodificacao.json();
                    errorMsg = errorData.detail || errorMsg;
                } catch (e) {
                    console.error("Não foi possível extrair detalhes do erro", e);
                }
                
                throw new Error(errorMsg);
            }

            const responseData = await responseCodificacao.json();
            
            // Extrair a codificação facial
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

            if (!codificacao) {
                throw new Error("Não foi possível obter a codificação facial da imagem.");
            }

            // Verificar se pelo menos um dia tem horário preenchido
            const diasAtivos = Object.entries(horariosSemana).filter(([_, config]) => config.ativo);
            
            if (diasAtivos.length === 0) {
                throw new Error("Configure pelo menos um dia com horário de trabalho");
            }

            // Validar formato dos horários para dias ativos
            const horariosValidos = diasAtivos.every(([_, config]) => {
                const entradaValida = /^([01]\d|2[0-3]):([0-5]\d)$/.test(config.entrada);
                const saidaValida = /^([01]\d|2[0-3]):([0-5]\d)$/.test(config.saida);
                return entradaValida && saidaValida;
            });

            if (!horariosValidos) {
                throw new Error("Formato de horário inválido. Use o formato HH:MM");
            }

            // Criar objeto horarioTrabalho - INCLUINDO horarioTrabalho explicitamente
            const horarioTrabalho = {};

            // Adicionar apenas os dias ativos com valores de string
            Object.entries(horariosSemana).forEach(([dia, config]) => {
                if (config.ativo) {
                    horarioTrabalho[dia] = {
                        entrada: config.entrada || null,
                        saida: config.saida || null
                    };
                }
            });

            // Verificar se o objeto está vazio
            if (Object.keys(horarioTrabalho).length === 0) {
                throw new Error("É necessário configurar pelo menos um dia de trabalho");
            }

            // Log detalhado para depuração
            console.log("Dias ativos:", diasAtivos.map(([dia]) => dia).join(", "));
            console.log("Objeto horarioTrabalho:", JSON.stringify(horarioTrabalho, null, 2));
            
            // Verificar se o objeto horarioTrabalho tem pelo menos uma entrada
            if (Object.keys(horarioTrabalho).length === 0) {
                throw new Error("Objeto horarioTrabalho vazio - nenhum dia ativo foi configurado");
            }

            // Criar payload com a estrutura correta para a API
            const payload = {
                nome: username,
                email,
                senha,
                foto: codificacao,
                perfil: fotoBase64,
                role: "funcionario",
                horarioTrabalho
            };

            console.log("Enviando dados de cadastro...");
            console.log("Payload completo:", JSON.stringify({
                ...payload,
                foto: "[Array de codificação]", // Não logamos a codificação facial completa por ser muito grande
                perfil: "[Imagem em base64]"    // Não logamos a imagem completa
            }, null, 2));

            // Enviar dados para API de cadastro
            const responseCadastro = await fetch(
                "https://faceponto-banco-dados-production.up.railway.app/usuarios/cadastro",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!responseCadastro.ok) {
                const errorData = await responseCadastro.json();
                console.error("Resposta de erro da API:", errorData);
                throw new Error(errorData.erro || "Erro ao realizar cadastro.");
            }

            setSucesso(true);
        } catch (error) {
            console.error("Erro no processo de cadastro:", error);
            setErro(error.message);
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="page-container">
            {/* Cabeçalho com logo */}
            <div className="app-header">
                <div className="logo-container">
                    <img src="/logo.png" alt="FacePonto Logo" className="logo-image" />
                </div>
                <h1 className="app-title">FacePonto</h1>
            </div>
            
            {carregando && <LoadingSpinner message="Processando cadastro..." />}

            {sucesso && ReactDOM.createPortal(
                <div className="confirmation-overlay">
                    <div className="confirmation-content">
                        <div className="confirmation-icon">
                            <FaCheckCircle size={40} />
                        </div>
                        <p className="confirmation-message">
                            Cadastro realizado com sucesso!
                        </p>
                        <button className="confirmation-button" onClick={() => navigate("/login")}>
                            Ir para o Login
                        </button>
                    </div>
                </div>,
                document.body
            )}

            <div className={`container cadastro-container ${carregando ? "invisible" : ""}`}>
                {!sucesso && (
                    <>
                        {/* Indicador de etapas */}
                        <div className="etapas-container">
                            <div className={`etapa ${etapaAtual === 0 ? 'etapa-ativa' : (etapaAtual > 0 ? 'etapa-completa' : '')}`}>
                                <div className="etapa-numero">
                                    {etapaAtual > 0 ? <FaCheck /> : 1}
                                </div>
                                <div className="etapa-nome">Usuário</div>
                            </div>
                            <div className="etapa-linha"></div>
                            <div className={`etapa ${etapaAtual === 1 ? 'etapa-ativa' : (etapaAtual > 1 ? 'etapa-completa' : '')}`}>
                                <div className="etapa-numero">
                                    {etapaAtual > 1 ? <FaCheck /> : 2}
                                </div>
                                <div className="etapa-nome">Foto</div>
                            </div>
                            <div className="etapa-linha"></div>
                            <div className={`etapa ${etapaAtual === 2 ? 'etapa-ativa' : ''}`}>
                                <div className="etapa-numero">3</div>
                                <div className="etapa-nome">Horários</div>
                            </div>
                        </div>

                        <form onSubmit={etapaAtual === 2 ? handleSubmit : (e) => e.preventDefault()}>
                            <h1>Cadastre-se ao sistema</h1>

                            {erro && <p className="erro">{erro}</p>}

                            {/* Etapa 1: Informações do usuário */}
                            {etapaAtual === 0 && (
                                <div className="etapa-conteudo fade-in">
                                    <div className="input-field">
                                        <input
                                            type="text"
                                            placeholder="Nome completo"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            required
                                        />
                                        <FaUser className="icon" />
                                    </div>
                                    
                                    <div className="input-field">
                                        <input
                                            type="email"
                                            placeholder="E-mail"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                        <FaEnvelope className="icon" />
                                    </div>
                                    
                                    <div className="input-field">
                                        <input
                                            type="password"
                                            placeholder="Senha"
                                            value={senha}
                                            onChange={(e) => setSenha(e.target.value)}
                                            required
                                        />
                                        <FaLock className="icon" />
                                    </div>
                                    
                                    <div className="input-field">
                                        <input
                                            type="password"
                                            placeholder="Confirmar Senha"
                                            value={confirmarSenha}
                                            onChange={(e) => setConfirmarSenha(e.target.value)}
                                            required
                                        />
                                        <FaLock className="icon" />
                                    </div>

                                    <div className="botoes-navegacao">
                                        <button type="button" onClick={irParaProximaEtapa} className="botao-primario">
                                            Próximo <FaArrowRight />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Etapa 2: Upload de foto */}
                            {etapaAtual === 1 && (
                                <div className="etapa-conteudo fade-in">
                                    <div className="foto-upload-container">
                                        <input
                                            id="foto"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFotoChange}
                                            className="foto-input"
                                        />
                                        
                                        <label htmlFor="foto" className="foto-drop-area">
                                            {fotoPreview ? (
                                                <div className="foto-preview">
                                                    <img src={fotoPreview} alt="Preview da foto" />
                                                    <div className="foto-overlay">
                                                        <FaUpload />
                                                        <span>Alterar foto</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="foto-placeholder">
                                                    <FaUpload className="upload-icon" />
                                                    <p>Clique ou arraste uma foto de rosto</p>
                                                    <span>Formatos: JPG, PNG (máx. 5MB)</span>
                                                </div>
                                            )}
                                        </label>
                                        
                                        {fotoNome && <p className="foto-nome">{fotoNome}</p>}
                                    </div>
                                    
                                    <div className="instrucoes-foto">
                                        <h4>Para melhores resultados:</h4>
                                        <ul>
                                            <li>Use uma foto com boa iluminação</li>
                                            <li>Mantenha o rosto centralizado</li>
                                            <li>Evite acessórios que cubram partes do rosto</li>
                                        </ul>
                                    </div>

                                    <div className="botoes-navegacao">
                                        <button type="button" onClick={voltarEtapa} className="botao-secundario">
                                            <FaArrowLeft /> Voltar
                                        </button>
                                        <button type="button" onClick={irParaProximaEtapa} className="botao-primario">
                                            Próximo <FaArrowRight />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Etapa 3: Configuração de horários */}
                            {etapaAtual === 2 && (
                                <div className="etapa-conteudo fade-in">
                                    <div className="horarios-config-container">
                                        <div className="horarios-tabs">
                                            <button 
                                                type="button" 
                                                className={`horario-tab ${diasAgrupados ? 'ativo' : ''}`}
                                                onClick={() => setDiasAgrupados(true)}
                                            >
                                                Padrão
                                            </button>
                                            <button 
                                                type="button" 
                                                className={`horario-tab ${!diasAgrupados ? 'ativo' : ''}`}
                                                onClick={() => setDiasAgrupados(false)}
                                            >
                                                Personalizado
                                            </button>
                                        </div>

                                        {diasAgrupados ? (
                                            <div className="horarios-padrao">
                                                <div className="grupo-dias">
                                                    <div className="grupo-titulo">
                                                        <h4>Dias úteis (Seg-Sex)</h4>
                                                        <label className="switch">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={['segunda', 'terca', 'quarta', 'quinta', 'sexta'].some(dia => horariosSemana[dia].ativo)}
                                                                onChange={() => {
                                                                    const estaoAtivos = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'].some(dia => horariosSemana[dia].ativo);
                                                                    aplicarHorariosDiasEspecificos(
                                                                        ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
                                                                        null, null, !estaoAtivos
                                                                    );
                                                                }}
                                                            />
                                                            <span className="slider round"></span>
                                                        </label>
                                                    </div>
                                                    
                                                    <div className="horario-inputs">
                                                        <div className="horario-grupo">
                                                            <label>Entrada</label>
                                                            <input 
                                                                type="time" 
                                                                value={horariosSemana.segunda.entrada} 
                                                                onChange={(e) => aplicarHorariosDiasEspecificos(
                                                                    ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
                                                                    e.target.value, null
                                                                )}
                                                                disabled={!['segunda', 'terca', 'quarta', 'quinta', 'sexta'].some(dia => horariosSemana[dia].ativo)}
                                                            />
                                                        </div>
                                                        <div className="horario-grupo">
                                                            <label>Saída</label>
                                                            <input 
                                                                type="time" 
                                                                value={horariosSemana.segunda.saida} 
                                                                onChange={(e) => aplicarHorariosDiasEspecificos(
                                                                    ['segunda', 'terca', 'quarta', 'quinta', 'sexta'],
                                                                    null, e.target.value
                                                                )}
                                                                disabled={!['segunda', 'terca', 'quarta', 'quinta', 'sexta'].some(dia => horariosSemana[dia].ativo)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grupo-dias">
                                                    <div className="grupo-titulo">
                                                        <h4>Sábado</h4>
                                                        <label className="switch">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={horariosSemana.sabado.ativo}
                                                                onChange={() => toggleDiaAtivo('sabado')}
                                                            />
                                                            <span className="slider round"></span>
                                                        </label>
                                                    </div>
                                                    
                                                    <div className="horario-inputs">
                                                        <div className="horario-grupo">
                                                            <label>Entrada</label>
                                                            <input 
                                                                type="time" 
                                                                value={horariosSemana.sabado.entrada} 
                                                                onChange={(e) => ajustarHorario('sabado', 'entrada', e.target.value)}
                                                                disabled={!horariosSemana.sabado.ativo}
                                                            />
                                                        </div>
                                                        <div className="horario-grupo">
                                                            <label>Saída</label>
                                                            <input 
                                                                type="time" 
                                                                value={horariosSemana.sabado.saida} 
                                                                onChange={(e) => ajustarHorario('sabado', 'saida', e.target.value)}
                                                                disabled={!horariosSemana.sabado.ativo}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grupo-dias">
                                                    <div className="grupo-titulo">
                                                        <h4>Domingo</h4>
                                                        <label className="switch">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={horariosSemana.domingo.ativo}
                                                                onChange={() => toggleDiaAtivo('domingo')}
                                                            />
                                                            <span className="slider round"></span>
                                                        </label>
                                                    </div>
                                                    
                                                    <div className="horario-inputs">
                                                        <div className="horario-grupo">
                                                            <label>Entrada</label>
                                                            <input 
                                                                type="time" 
                                                                value={horariosSemana.domingo.entrada} 
                                                                onChange={(e) => ajustarHorario('domingo', 'entrada', e.target.value)}
                                                                disabled={!horariosSemana.domingo.ativo}
                                                            />
                                                        </div>
                                                        <div className="horario-grupo">
                                                            <label>Saída</label>
                                                            <input 
                                                                type="time" 
                                                                value={horariosSemana.domingo.saida} 
                                                                onChange={(e) => ajustarHorario('domingo', 'saida', e.target.value)}
                                                                disabled={!horariosSemana.domingo.ativo}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="horarios-personalizados">
                                                {['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map(dia => {
                                                    const nomeDia = {
                                                        'domingo': 'Dom.',
                                                        'segunda': 'Seg.',
                                                        'terca': 'Ter.',
                                                        'quarta': 'Qua.',
                                                        'quinta': 'Qui.',
                                                        'sexta': 'Sex.',
                                                        'sabado': 'Sab.'
                                                    }[dia];
                                                    
                                                    return (
                                                        <div key={dia} className="dia-horario-row">
                                                            <div className="dia-nome">
                                                                <label className="switch-label">
                                                                    <span>{nomeDia}</span>
                                                                    <div className="switch-mini">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={horariosSemana[dia].ativo}
                                                                            onChange={() => toggleDiaAtivo(dia)}
                                                                        />
                                                                        <span className="slider-mini round"></span>
                                                                    </div>
                                                                </label>
                                                            </div>
                                                            
                                                            <div className="dia-horarios">
                                                                <input 
                                                                    type="time" 
                                                                    value={horariosSemana[dia].entrada} 
                                                                    onChange={(e) => ajustarHorario(dia, 'entrada', e.target.value)}
                                                                    disabled={!horariosSemana[dia].ativo}
                                                                />
                                                                <span className="horario-ate">até</span>
                                                                <input 
                                                                    type="time" 
                                                                    value={horariosSemana[dia].saida} 
                                                                    onChange={(e) => ajustarHorario(dia, 'saida', e.target.value)}
                                                                    disabled={!horariosSemana[dia].ativo}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="botoes-navegacao">
                                        <button type="button" onClick={voltarEtapa} className="botao-secundario">
                                            <FaArrowLeft /> Voltar
                                        </button>
                                        <button type="submit" className="botao-primario">
                                            Concluir Cadastro <FaCheck />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default Cadastro;