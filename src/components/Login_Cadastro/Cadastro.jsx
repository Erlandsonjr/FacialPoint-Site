import React, { useState } from "react";
import {
  FaUser,
  FaEnvelope,
  FaLock,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaUpload,
  FaCheck,
} from "react-icons/fa";
import { useNavigate, Link } from "react-router-dom";
import "./Login_Cadastro.css";
import LoadingSpinner from "./LoadingSpinner";
import ReactDOM from "react-dom";

function Cadastro() {
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

  const [etapaAtual, setEtapaAtual] = useState(0);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [diasAgrupados, setDiasAgrupados] = useState(true);

  const navigate = useNavigate();

  const toggleDiaAtivo = (dia) => {
    setHorariosSemana({
      ...horariosSemana,
      [dia]: {
        ...horariosSemana[dia],
        ativo: !horariosSemana[dia].ativo,
      },
    });
  };

  const ajustarHorario = (dia, tipo, valor) => {
    const [horas, minutos] = valor.split(":");
    setHorariosSemana({
      ...horariosSemana,
      [dia]: {
        ...horariosSemana[dia],
        [tipo]: `${horas.padStart(2, "0")}:${minutos.padStart(2, "0")}`,
      },
    });
  };

  const aplicarHorariosDiasEspecificos = (dias, entrada, saida, ativo) => {
    const novosHorarios = { ...horariosSemana };
    dias.forEach((dia) => {
      novosHorarios[dia] = {
        ...novosHorarios[dia],
        entrada: entrada || novosHorarios[dia].entrada,
        saida: saida || novosHorarios[dia].saida,
        ativo: ativo !== undefined ? ativo : novosHorarios[dia].ativo,
      };
    });
    setHorariosSemana(novosHorarios);
  };

  const validarEtapa = () => {
    switch (etapaAtual) {
      case 0:
        if (!username.trim()) return "Nome é obrigatório";
        if (!email.trim()) return "E-mail é obrigatório";
        if (!email.includes("@") || !email.includes("."))
          return "E-mail inválido";
        if (senha.length < 3) return "Senha deve ter pelo menos 3 caracteres";
        if (senha !== confirmarSenha) return "As senhas não coincidem";
        return null;
      case 1:
        if (!foto) return "Por favor, selecione uma foto";
        return null;
      case 2:
        const algumDiaAtivo = Object.values(horariosSemana).some(
          (dia) => dia.ativo
        );
        if (!algumDiaAtivo) return "Selecione pelo menos um dia de trabalho";
        for (const [dia, config] of Object.entries(horariosSemana)) {
          if (config.ativo) {
            const [eh, em] = config.entrada.split(":").map(Number);
            const [sh, sm] = config.saida.split(":").map(Number);
            const entradaMin = eh * 60 + em;
            const saidaMin = sh * 60 + sm;
            if (entradaMin >= saidaMin)
              return `No dia ${dia.charAt(0).toUpperCase() + dia.slice(1)}, o horário de entrada deve ser antes do horário de saída`;
            if (saidaMin - entradaMin < 15)
              return `No dia ${dia.charAt(0).toUpperCase() + dia.slice(1)}, o horário de saída deve ter pelo menos 15 minutos de diferença do horário de entrada`;
          }
        }
        return null;
      default:
        return null;
    }
  };

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

  const handleFotoChange = (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      if (!arquivo.type.includes("image/")) {
        setErro("Por favor, selecione apenas arquivos de imagem.");
        return;
      }
      if (arquivo.size > 5 * 1024 * 1024) {
        setErro("A imagem deve ter no máximo 5MB.");
        return;
      }
      setFoto(arquivo);
      setFotoNome(arquivo.name);
      const reader = new FileReader();
      reader.onload = (e) => setFotoPreview(e.target.result);
      reader.readAsDataURL(arquivo);
      setErro("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const erro = validarEtapa();
    if (erro) {
      setErro(erro);
      return;
    }
    setErro("");
    setCarregando(true);
    try {
      const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };
      const fotoBase64 = await convertToBase64(foto);
      const formData = new FormData();
      formData.append("file", foto);
      const responseCodificacao = await fetch(
        "https://gerarcodificacaofaceponto-production.up.railway.app/gerar-codificacao",
        {
          method: "POST",
          body: formData,
        }
      );
      if (!responseCodificacao.ok) {
        const errorStatus = responseCodificacao.status;
        let errorMsg = `Erro ao processar foto (${errorStatus})`;
        try {
          const errorData = await responseCodificacao.json();
          errorMsg = errorData.detail || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
      }
      const responseData = await responseCodificacao.json();
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
        throw new Error(
          "Não foi possível obter a codificação facial da imagem."
        );
      }
      const diasAtivos = Object.entries(horariosSemana).filter(
        ([_, config]) => config.ativo
      );
      if (diasAtivos.length === 0) {
        throw new Error("Configure pelo menos um dia com horário de trabalho");
      }
      const horariosValidos = diasAtivos.every(([_, config]) => {
        const entradaValida = /^([01]\d|2[0-3]):([0-5]\d)$/.test(
          config.entrada
        );
        const saidaValida = /^([01]\d|2[0-3]):([0-5]\d)$/.test(config.saida);
        return entradaValida && saidaValida;
      });
      if (!horariosValidos) {
        throw new Error("Formato de horário inválido. Use o formato HH:MM");
      }
      const horarioTrabalho = {};
      Object.entries(horariosSemana).forEach(([dia, config]) => {
        if (config.ativo) {
          horarioTrabalho[dia] = {
            entrada: config.entrada || null,
            saida: config.saida || null,
          };
        }
      });
      if (Object.keys(horarioTrabalho).length === 0) {
        throw new Error(
          "É necessário configurar pelo menos um dia de trabalho"
        );
      }
      const payload = {
        nome: username,
        email,
        senha,
        foto: codificacao,
        perfil: fotoBase64,
        role: "funcionario",
        horarioTrabalho,
      };
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
        throw new Error(errorData.erro || "Erro ao realizar cadastro.");
      }
      setSucesso(true);
    } catch (error) {
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-page-container-clean">
      <div className="login-header">
        <Link to="/" className="login-logo-link">
          <div className="login-logo-container">
            <img src="/logo.png" alt="FacePonto Logo" className="login-logo" />
          </div>
          <h1 className="login-title">FacePonto</h1>
        </Link>
      </div>

      {carregando && <LoadingSpinner message="Processando cadastro..." />}
      {sucesso &&
        ReactDOM.createPortal(
          <div className="confirmation-overlay">
            <div className="confirmation-content">
              <div className="confirmation-icon">
                <FaCheckCircle size={40} />
              </div>
              <p className="confirmation-message">
                Cadastro realizado com sucesso!
              </p>
              <button
                className="confirmation-button"
                onClick={() => navigate("/login")}
              >
                Ir para o Login
              </button>
            </div>
          </div>,
          document.body
        )}
      <div className="login-content-wrapper">
        <div
          className={`login-form-container cadastro-form-container ${
            carregando ? "login-loading" : ""
          }`}
        >
          {!sucesso && (
            <>
              <div className="login-form-header">
                <h2>
                  Cadastre-se ao{" "}
                  <span className="highlight">Sistema</span>
                </h2>
                <p className="login-subtitle">
                  Complete as etapas abaixo para criar sua conta
                </p>
              </div>

              <div className="etapas-container">
                <div
                  className={`etapa ${
                    etapaAtual === 0
                      ? "etapa-ativa"
                      : etapaAtual > 0
                      ? "etapa-completa"
                      : ""
                  }`}
                >
                  <div className="etapa-numero">
                    {etapaAtual > 0 ? <FaCheck /> : 1}
                  </div>
                  <div className="etapa-nome">Usuário</div>
                </div>
                <div className="etapa-linha"></div>
                <div
                  className={`etapa ${
                    etapaAtual === 1
                      ? "etapa-ativa"
                      : etapaAtual > 1
                      ? "etapa-completa"
                      : ""
                  }`}
                >
                  <div className="etapa-numero">
                    {etapaAtual > 1 ? <FaCheck /> : 2}
                  </div>
                  <div className="etapa-nome">Foto</div>
                </div>
                <div className="etapa-linha"></div>
                <div className={`etapa ${etapaAtual === 2 ? "etapa-ativa" : ""}`}>
                  <div className="etapa-numero">3</div>
                  <div className="etapa-nome">Horários</div>
                </div>
              </div>

              <form
                onSubmit={
                  etapaAtual === 2 ? handleSubmit : (e) => e.preventDefault()
                }
              >
                {etapaAtual === 0 && (
                  <div className="etapa-conteudo fade-in">
                    <div className="login-input-group">
                      <label htmlFor="nome">Nome completo</label>
                      <div className="login-input-field">
                        <FaUser className="login-input-icon" />
                        <input
                          id="nome"
                          type="text"
                          placeholder="Nome completo"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="login-input-group">
                      <label htmlFor="email">E-mail</label>
                      <div className="login-input-field">
                        <FaEnvelope className="login-input-icon" />
                        <input
                          id="email"
                          type="email"
                          placeholder="E-mail"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="login-input-group">
                      <label htmlFor="senha">Senha</label>
                      <div className="login-input-field">
                        <FaLock className="login-input-icon" />
                        <input
                          id="senha"
                          type="password"
                          placeholder="Senha"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="login-input-group">
                      <label htmlFor="confirmarSenha">Confirmar senha</label>
                      <div className="login-input-field">
                        <FaLock className="login-input-icon" />
                        <input
                          id="confirmarSenha"
                          type="password"
                          placeholder="Confirmar Senha"
                          value={confirmarSenha}
                          onChange={(e) => setConfirmarSenha(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="login-button-container">
                      <button
                        type="button"
                        onClick={irParaProximaEtapa}
                        className="login-button"
                      >
                        Próximo <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )}
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
                      <button
                        type="button"
                        onClick={voltarEtapa}
                        className="botao-secundario"
                      >
                        <FaArrowLeft /> Voltar
                      </button>
                      <button
                        type="button"
                        onClick={irParaProximaEtapa}
                        className="botao-primario"
                      >
                        Próximo <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )}
                {etapaAtual === 2 && (
                  <div className="etapa-conteudo fade-in">
                    <div className="horarios-config-container">
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 28,
                          marginTop: 18,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 16,
                            minHeight: 38,
                          }}
                        >
                          <span
                            style={{
                              color: "#f5a623",
                              fontWeight: 600,
                              fontSize: 18,
                              letterSpacing: 0.2,
                              lineHeight: "38px",
                            }}
                          >
                            Personalizar horários
                          </span>
                          <label
                            className="switch switch-lg"
                            style={{ verticalAlign: "middle" }}
                          >
                            <input
                              type="checkbox"
                              checked={!diasAgrupados}
                              onChange={() => setDiasAgrupados((v) => !v)}
                            />
                            <span className="slider round"></span>
                          </label>
                        </div>
                        <span
                          style={{
                            color: "#fff",
                            fontSize: 13,
                            opacity: 0.7,
                            marginTop: 2,
                          }}
                        >
                          Ative para configurar horários diferentes por dia
                        </span>
                      </div>
                      {diasAgrupados ? (
                        <div className="horarios-padrao">
                          <div className="grupo-dias">
                            <div className="grupo-titulo">
                              <h4>Dias úteis (Seg-Sex)</h4>
                              <label className="switch">
                                <input
                                  type="checkbox"
                                  checked={[
                                    "segunda",
                                    "terca",
                                    "quarta",
                                    "quinta",
                                    "sexta",
                                  ].some((dia) => horariosSemana[dia].ativo)}
                                  onChange={() => {
                                    const estaoAtivos = [
                                      "segunda",
                                      "terca",
                                      "quarta",
                                      "quinta",
                                      "sexta",
                                    ].some((dia) => horariosSemana[dia].ativo);
                                    aplicarHorariosDiasEspecificos(
                                      [
                                        "segunda",
                                        "terca",
                                        "quarta",
                                        "quinta",
                                        "sexta",
                                      ],
                                      null,
                                      null,
                                      !estaoAtivos
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
                                  onChange={(e) =>
                                    aplicarHorariosDiasEspecificos(
                                      [
                                        "segunda",
                                        "terca",
                                        "quarta",
                                        "quinta",
                                        "sexta",
                                      ],
                                      e.target.value,
                                      null
                                    )
                                  }
                                  disabled={
                                    ![
                                      "segunda",
                                      "terca",
                                      "quarta",
                                      "quinta",
                                      "sexta",
                                    ].some((dia) => horariosSemana[dia].ativo)
                                  }
                                />
                              </div>
                              <div className="horario-grupo">
                                <label>Saída</label>
                                <input
                                  type="time"
                                  value={horariosSemana.segunda.saida}
                                  onChange={(e) =>
                                    aplicarHorariosDiasEspecificos(
                                      [
                                        "segunda",
                                        "terca",
                                        "quarta",
                                        "quinta",
                                        "sexta",
                                      ],
                                      null,
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    ![
                                      "segunda",
                                      "terca",
                                      "quarta",
                                      "quinta",
                                      "sexta",
                                    ].some((dia) => horariosSemana[dia].ativo)
                                  }
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
                                  onChange={() => toggleDiaAtivo("sabado")}
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
                                  onChange={(e) =>
                                    ajustarHorario(
                                      "sabado",
                                      "entrada",
                                      e.target.value
                                    )
                                  }
                                  disabled={!horariosSemana.sabado.ativo}
                                />
                              </div>
                              <div className="horario-grupo">
                                <label>Saída</label>
                                <input
                                  type="time"
                                  value={horariosSemana.sabado.saida}
                                  onChange={(e) =>
                                    ajustarHorario(
                                      "sabado",
                                      "saida",
                                      e.target.value
                                    )
                                  }
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
                                  onChange={() => toggleDiaAtivo("domingo")}
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
                                  onChange={(e) =>
                                    ajustarHorario(
                                      "domingo",
                                      "entrada",
                                      e.target.value
                                    )
                                  }
                                  disabled={!horariosSemana.domingo.ativo}
                                />
                              </div>
                              <div className="horario-grupo">
                                <label>Saída</label>
                                <input
                                  type="time"
                                  value={horariosSemana.domingo.saida}
                                  onChange={(e) =>
                                    ajustarHorario(
                                      "domingo",
                                      "saida",
                                      e.target.value
                                    )
                                  }
                                  disabled={!horariosSemana.domingo.ativo}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="horarios-personalizados horarios-personalizados-centralizado">
                          {[
                            "domingo",
                            "segunda",
                            "terca",
                            "quarta",
                            "quinta",
                            "sexta",
                            "sabado",
                          ].map((dia) => {
                            const nomeDia = {
                              domingo: "Dom.",
                              segunda: "Seg.",
                              terca: "Ter.",
                              quarta: "Qua.",
                              quinta: "Qui.",
                              sexta: "Sex.",
                              sabado: "Sab.",
                            }[dia];
                            return (
                              <div
                                key={dia}
                                className="dia-horario-row dia-horario-row-centralizado"
                              >
                                <div className="dia-nome">
                                  <label className="checkbox-label">
                                    <input
                                      type="checkbox"
                                      checked={horariosSemana[dia].ativo}
                                      onChange={() => toggleDiaAtivo(dia)}
                                      className="checkbox-dia"
                                    />
                                    <span>{nomeDia}</span>
                                  </label>
                                </div>
                                <div className="dia-horarios">
                                  <input
                                    type="time"
                                    value={horariosSemana[dia].entrada}
                                    onChange={(e) =>
                                      ajustarHorario(
                                        dia,
                                        "entrada",
                                        e.target.value
                                      )
                                    }
                                    disabled={!horariosSemana[dia].ativo}
                                  />
                                  <span className="horario-ate">até</span>
                                  <input
                                    type="time"
                                    value={horariosSemana[dia].saida}
                                    onChange={(e) =>
                                      ajustarHorario(dia, "saida", e.target.value)
                                    }
                                    disabled={!horariosSemana[dia].ativo}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="aviso-horario-am-pm">
                      Para mudar entre am e pm basta digitar "am" ou "pm" no campo
                      de horário.
                    </div>
                    {erro && <div className="login-error-message" style={{ marginTop: 18 }}>{erro}</div>}
                    <div className="botoes-navegacao cadastro-botoes">
                      <button
                        type="button"
                        onClick={voltarEtapa}
                        className="botao-secundario"
                      >
                        <FaArrowLeft /> Voltar
                      </button>
                      <button type="submit" className="login-button">
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
    </div>
  );
}

export default Cadastro;