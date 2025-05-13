import React, { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaCheck,
  FaRedo,
  FaInfoCircle,
  FaRegLightbulb,
} from "react-icons/fa";
import "./registro.css";
import LoadingSpinner from "../Login_Cadastro/LoadingSpinner";
import axios from "axios";

function RegistroPonto() {
  const [stream, setStream] = useState(null);
  const [foto, setFoto] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mostrarDicas, setMostrarDicas] = useState(false);
  const [permissaoCamera, setPermissaoCamera] = useState("nao-solicitada");
  const [contadorTempo, setContadorTempo] = useState(0);
  const [timerAtivo, setTimerAtivo] = useState(false);
  const [verificacaoCompleta, setVerificacaoCompleta] = useState(false);
  const [serverTime, setServerTime] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const inicializacao = async () => {
      setCarregando(true);
      await fetchServerTime();
      setVerificacaoCompleta(true);
      setCarregando(false);
    };

    inicializacao();

    return () => {
      pararCamera();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Substitua a função fetchServerTime existente
  const fetchServerTime = async () => {
    try {
      setCarregando(true);

      const timeResponse = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/horario-brasilia"
      );

      if (!timeResponse.ok) {
        throw new Error(`Erro ao obter horário: ${timeResponse.status}`);
      }

      // Adicione estes logs após obter a resposta json
      const timeData = await timeResponse.json();
      console.log("Resposta do servidor (formato bruto):", timeData);
      console.log("Tipo da resposta:", typeof timeData);
      console.log("Campos presentes:", Object.keys(timeData || {}));
      console.log("Resposta do servidor (horário):", timeData);

      // Verificação mais robusta do formato da resposta
      let serverTime = null;

      // Prioridade 1: Usar o formato antigo com horario e data
      if (timeData && timeData.horario) {
        serverTime = new Date(timeData.horario);
        console.log("Horário criado a partir do campo horario:", serverTime);
      }
      // Prioridade 2: Usar components se disponível e válido
      else if (
        timeData &&
        timeData.components &&
        typeof timeData.components.year === "number" &&
        typeof timeData.components.month === "number"
      ) {
        const components = timeData.components;
        serverTime = new Date(
          components.year,
          components.month - 1, // Converter mês baseado em 1 para baseado em 0
          components.day,
          components.hour,
          components.minute,
          components.second
        );
        console.log("Horário criado a partir de components:", serverTime);
      }
      // Prioridade 3: Usar isoString se disponível e válido
      else if (
        timeData &&
        timeData.isoString &&
        typeof timeData.isoString === "string"
      ) {
        serverTime = new Date(timeData.isoString);
        console.log("Horário criado a partir de isoString:", serverTime);
      }
      // Prioridade 4: Usar timestamp se disponível e válido
      else if (
        timeData &&
        timeData.timestamp &&
        typeof timeData.timestamp === "number"
      ) {
        serverTime = new Date(timeData.timestamp);
        console.log("Horário criado a partir de timestamp:", serverTime);
      } else {
        throw new Error("Formato de resposta do servidor não reconhecido");
      }

      if (!serverTime || isNaN(serverTime.getTime())) {
        console.error("Data inválida criada:", serverTime);
        throw new Error("Não foi possível criar um objeto Date válido");
      }

      setServerTime(serverTime);
      console.log("Horário obtido do servidor:", serverTime);
      return serverTime;
    } catch (error) {
      console.error("Erro ao obter horário do servidor:", error);
      setErro(
        "Não foi possível sincronizar com o horário do servidor. Tente novamente."
      );
      // Não usamos fallback de horário local
      return null;
    } finally {
      setCarregando(false);
    }
  };

  // Adicione este novo useEffect após os existentes
  // Modifique este useEffect (que atualmente faz requisições a cada 30 segundos)
  useEffect(() => {
    let localTimer;
    let syncTimer;
    let localTime = null;

    // Função para sincronizar com o servidor (similar ao updateServerTime existente)
    const syncWithServer = async () => {
      try {
        // Adicionar parâmetro para evitar cache
        const timeResponse = await fetch(
          `https://faceponto-banco-dados-production.up.railway.app/horario-brasilia?t=${Date.now()}`
        );

        if (!timeResponse.ok) {
          throw new Error(`Erro ao atualizar horário: ${timeResponse.status}`);
        }

        const timeData = await timeResponse.json();
        console.log("Atualização de horário recebida:", timeData);

        let serverTime = null;

        // Prioridade 1: Usar o formato antigo com horario
        if (timeData && timeData.horario) {
          serverTime = new Date(timeData.horario);
          console.log("Horário sincronizado do servidor:", serverTime);
        }
        // Prioridade 2: Usar components se disponível
        else if (
          timeData &&
          timeData.components &&
          typeof timeData.components.year === "number" &&
          typeof timeData.components.month === "number"
        ) {
          const components = timeData.components;
          serverTime = new Date(
            components.year,
            components.month - 1,
            components.day,
            components.hour,
            components.minute,
            components.second
          );
          console.log("Horário criado a partir de components:", serverTime);
        }
        // Prioridade 3: Usar isoString se disponível
        else if (
          timeData &&
          timeData.isoString &&
          typeof timeData.isoString === "string"
        ) {
          serverTime = new Date(timeData.isoString);
          console.log("Horário criado a partir de isoString:", serverTime);
        }
        // Prioridade 4: Usar timestamp se disponível
        else if (
          timeData &&
          timeData.timestamp &&
          typeof timeData.timestamp === "number"
        ) {
          serverTime = new Date(timeData.timestamp);
          console.log("Horário criado a partir de timestamp:", serverTime);
        } else {
          throw new Error("Formato de resposta do servidor não reconhecido");
        }

        // Atualizar o horário local com o do servidor
        localTime = serverTime;
        setServerTime(serverTime);
      } catch (err) {
        console.error("Erro ao atualizar horário do servidor:", err);
        // Não mostra erro na interface para não sobrecarregar com mensagens
      }
    };

    // Função para incrementar o horário localmente a cada segundo
    const updateLocalTime = () => {
      if (localTime) {
        // Incrementa o horário local em 1 segundo
        localTime = new Date(localTime.getTime() + 1000);
        setServerTime(new Date(localTime));
      }
    };

    // Sincronizar com o servidor inicialmente
    syncWithServer();

    // Configurar os dois timers:
    // 1. Atualização local (a cada segundo)
    localTimer = setInterval(updateLocalTime, 1000);

    // 2. Sincronização com o servidor (a cada 30 segundos)
    syncTimer = setInterval(syncWithServer, 30000);

    // Limpeza dos timers na desmontagem do componente
    return () => {
      clearInterval(localTimer);
      clearInterval(syncTimer);
    };
  }, []); // Sem dependências para executar apenas na montagem

  const iniciarCamera = async () => {
    try {
      setErro("");
      setCarregando(true);

      // Se não houver registro hoje, continua para ativar a câmera
      setPermissaoCamera("nao-solicitada");
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      };

      const streamCamera = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      setStream(streamCamera);
      setPermissaoCamera("concedida");

      if (videoRef.current) {
        videoRef.current.srcObject = streamCamera;
        await videoRef.current.play().catch((err) => {
          console.error("Erro ao iniciar reprodução de vídeo:", err);
        });
      }
      setCarregando(false);
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      setPermissaoCamera("negada");
      setErro(
        "Não foi possível acessar sua câmera. Por favor, verifique as permissões do navegador e tente novamente."
      );
      setCarregando(false);
    }
  };

  const pararCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const iniciarContagem = () => {
    setContadorTempo(3);
    setTimerAtivo(true);
  };

  const tirarFoto = () => {
    console.log("Tentando capturar foto...");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      console.error("Referências de vídeo ou canvas não encontradas");
      setErro("Erro ao capturar imagem: referências não encontradas");
      return;
    }
    try {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          console.error("Erro ao obter contexto 2d do canvas");
          setErro("Erro ao processar imagem");
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                console.log("Foto capturada com sucesso:", blob.size, "bytes");
                setFoto(blob);
                pararCamera();
              } else {
                console.error("Blob gerado é nulo");
                setErro("Erro ao processar a imagem capturada");
              }
            },
            "image/jpeg",
            0.9
          );
        } catch (blobError) {
          console.error("Erro ao gerar blob:", blobError);
          try {
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            console.log("DataURL gerado:", dataUrl.substring(0, 50) + "...");
            const byteString = atob(dataUrl.split(",")[1]);
            const mimeString = dataUrl
              .split(",")[0]
              .split(":")[1]
              .split(";")[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const manualBlob = new Blob([ab], { type: mimeString });
            setFoto(manualBlob);
            pararCamera();
          } catch (dataUrlError) {
            console.error("Também falhou ao usar dataURL:", dataUrlError);
            setErro("Não foi possível processar a imagem");
          }
        }
      } else {
        console.error(
          "Dimensões do vídeo não disponíveis:",
          video.videoWidth,
          video.videoHeight
        );
        setErro("Erro ao capturar imagem: vídeo não está pronto");
      }
    } catch (error) {
      console.error("Erro geral ao tirar foto:", error);
      setErro(
        "Ocorreu um erro ao capturar a foto. Por favor, tente novamente."
      );
    }
  };

  useEffect(() => {
    if (timerAtivo) {
      if (contadorTempo > 0) {
        timerRef.current = setTimeout(() => {
          setContadorTempo(contadorTempo - 1);
        }, 1000);
      } else {
        console.log("Contagem chegou a zero, chamando tirarFoto()");
        setTimerAtivo(false);
        tirarFoto();
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerAtivo, contadorTempo]);

  const registrarPonto = async () => {
    try {
      console.log("Iniciando registro de ponto...");
      setCarregando(true);
      setErro("");

      const token = localStorage.getItem("token");
      console.log("Token atual:", token ? "Token presente" : "Token ausente");

      if (!token || token === "undefined" || token === "null") {
        window.location.href = "/";
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      if (!foto) {
        setErro("Por favor, tire uma foto primeiro.");
        setCarregando(false);
        return;
      }

      // Buscar dados do usuário
      const registroResponse = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/usuarios/me",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      ).catch((networkError) => {
        console.error("Erro de rede:", networkError);
        throw new Error(
          "Erro de conexão com o servidor. Verifique sua internet."
        );
      });

      console.log("Status da resposta:", registroResponse.status);

      if (!registroResponse.ok) {
        const errorData = await registroResponse.json().catch(() => ({}));
        if (registroResponse.status === 401) {
          localStorage.removeItem("token");
          setTimeout(() => (window.location.href = "/"), 3000);
          throw new Error("Sessão expirada. Redirecionando para login...");
        }
        throw new Error(
          errorData?.message ||
            `Erro no servidor (${registroResponse.status}). Tente novamente.`
        );
      }

      let jsonRegistroResponse;
      try {
        jsonRegistroResponse = await registroResponse.json();
        if (!jsonRegistroResponse) {
          throw new Error("Resposta vazia do servidor");
        }
      } catch (jsonError) {
        console.error("Erro ao processar JSON:", jsonError);
        throw new Error(
          "Erro ao processar resposta do servidor. Formato inválido."
        );
      }

      const fotoCampo = jsonRegistroResponse.foto;
      if (!fotoCampo) {
        throw new Error(
          "Não há foto cadastrada para este usuário. Contate o administrador."
        );
      }

      const nomeToken = jsonRegistroResponse.nome;
      if (!nomeToken) {
        throw new Error("Dados de usuário incompletos. Nome não encontrado.");
      }

      let codificacaoArray;
      if (typeof fotoCampo === "string") {
        try {
          codificacaoArray = JSON.parse(fotoCampo);
          if (!Array.isArray(codificacaoArray)) {
            throw new Error("A codificação deve ser um array");
          }
        } catch (e) {
          console.error("Formato de codificação inválido:", e);
          throw new Error(
            "Formato de codificação facial inválido no banco de dados."
          );
        }
      } else if (Array.isArray(fotoCampo)) {
        codificacaoArray = fotoCampo;
      } else {
        console.error("Tipo de codificação não suportado:", typeof fotoCampo);
        throw new Error("Formato de codificação não suportado");
      }

      const formData = new FormData();
      formData.append("file", foto);

      codificacaoArray.forEach((valor) => {
        formData.append("codificacao", valor);
      });

      console.log(
        "Array de codificação:",
        Array.isArray(codificacaoArray),
        codificacaoArray.length + " itens"
      );

      try {
        const verificacaoResponse = await axios.post(
          "https://faceponto-reconhecimento-facial-production.up.railway.app/reconhecer/",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        console.log("Resposta da verificação:", verificacaoResponse.data);

        if (
          !verificacaoResponse.data.match &&
          !verificacaoResponse.data.success
        ) {
          throw new Error(
            "Não foi possível confirmar sua identidade. Por favor, tente novamente."
          );
        }

        // Formatar a data conforme o servidor espera
        const resposta = await fetch(
          "https://faceponto-banco-dados-production.up.railway.app/usuarios/me/frequencia",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              nome: nomeToken,
            }),
          }
        );

        if (!resposta.ok) {
          const errorText = await resposta.text();
          console.error("Texto da resposta de erro:", errorText);

          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { erro: errorText || "Erro desconhecido" };
          }

          throw new Error(
            errorData?.erro ||
              errorData?.message ||
              `Erro ao registrar frequência (${resposta.status}). Tente novamente.`
          );
        }

        const resultado = await resposta.json();
        console.log("Frequência registrada com sucesso:", resultado);
        setSucesso(true);
      } catch (axiosError) {
        console.error("Erro detalhado do Axios:", axiosError.response?.data);

        if (axiosError.response?.status === 422) {
          throw new Error(
            "Erro no formato dos dados enviados. Detalhes: " +
              JSON.stringify(
                axiosError.response.data?.detail || axiosError.response.data
              )
          );
        }

        throw axiosError;
      } finally {
        setCarregando(false);
      }
    } catch (error) {
      console.error("Erro geral:", error);
      setErro(
        error.message ||
          "Erro ao tentar registrar ponto. Por favor, tente novamente."
      );
      setCarregando(false);
    }
  };

  const voltarParaHome = () => {
    window.location.href = "/home";
  };

  return (
    <>
      {carregando && (
        <LoadingSpinner
          message={
            verificacaoCompleta
              ? "Processando seu registro..."
              : "Preparando câmera..."
          }
        />
      )}

      <div className="container-registro">
        <div className={`registro-content${carregando ? " invisible" : ""}`}>
          <div className="registro-header">
            <h1>Registro de Ponto</h1>
            <button
              className="dicas-button"
              onClick={() => setMostrarDicas(!mostrarDicas)}
              aria-label="Mostrar dicas para foto"
            >
              <FaRegLightbulb />
              {mostrarDicas ? "Ocultar dicas" : "Dicas para foto"}
            </button>
          </div>

          {mostrarDicas && (
            <div className="dicas-container">
              <h3>
                <FaInfoCircle /> Como tirar uma boa foto para reconhecimento
              </h3>
              <ul>
                <li>Posicione seu rosto no centro da câmera</li>
                <li>Certifique-se de que seu rosto esteja bem iluminado</li>
                <li>Evite usar chapéus, óculos escuros ou máscaras</li>
                <li>Mantenha uma expressão neutra</li>
                <li>Olhe diretamente para a câmera</li>
              </ul>
            </div>
          )}

          {erro && (
            <div className="erro-message">
              <p>{erro}</p>
            </div>
          )}

          {sucesso && (
            <div className="registro-sucesso">
              <div className="sucesso-message">
                <FaCheck className="sucesso-icon" />
                <p>Ponto registrado com sucesso!</p>
              </div>

              <div className="voltar-login">
                <p>
                  Seu registro foi realizado com sucesso. O que deseja fazer
                  agora?
                </p>
                <button className="login-button" onClick={voltarParaHome}>
                  Voltar para a Home
                </button>
              </div>
            </div>
          )}

          <div className="camera-container">
            {!foto && !stream && permissaoCamera !== "negada" && (
              <div className="camera-start">
                <button className="camera-button" onClick={iniciarCamera}>
                  <FaCamera />
                  Iniciar Câmera
                </button>
                <p className="camera-info">
                  Clique para ativar sua câmera e registrar seu ponto
                </p>
              </div>
            )}

            {permissaoCamera === "negada" && (
              <div className="permissao-negada">
                <FaInfoCircle size={40} />
                <h3>Permissão para câmera negada</h3>
                <p>
                  Para registrar seu ponto, você precisa permitir o acesso à
                  câmera nas configurações do seu navegador.
                </p>
                <button className="camera-button" onClick={iniciarCamera}>
                  Tentar novamente
                </button>
              </div>
            )}

            {stream && (
              <div className="camera-live">
                <div className="camera-frame">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="camera-preview"
                  />
                  {timerAtivo && (
                    <div className="timer-overlay">
                      <span className="timer-count">{contadorTempo}</span>
                    </div>
                  )}
                  <div className="face-overlay">
                    <div className="face-guide"></div>
                  </div>
                </div>
                <div className="camera-controls">
                  <button
                    className="control-button cancel"
                    onClick={pararCamera}
                    aria-label="Cancelar"
                  >
                    Cancelar
                  </button>
                  <button
                    className="capture-button"
                    onClick={iniciarContagem}
                    disabled={timerAtivo}
                    aria-label="Tirar foto"
                  >
                    <FaCamera />
                  </button>
                  <button
                    className="control-button switch-camera"
                    onClick={() => {
                      pararCamera();
                      setTimeout(iniciarCamera, 300);
                    }}
                    aria-label="Trocar câmera"
                  >
                    Reiniciar
                  </button>
                </div>
              </div>
            )}

            {foto && !sucesso && (
              <div className="foto-preview">
                <h3>Revisar Foto</h3>
                <img
                  src={URL.createObjectURL(foto)}
                  alt="Foto capturada"
                  className="foto-canvas"
                />
                <div className="foto-actions">
                  <button
                    className="action-button retry"
                    onClick={() => {
                      setFoto(null);
                      iniciarCamera();
                    }}
                  >
                    <FaRedo />
                    Nova Foto
                  </button>
                  <button
                    className="action-button confirm"
                    onClick={registrarPonto}
                  >
                    <FaCheck />
                    Confirmar e Registrar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="status-info">
            <p>
              {serverTime
                ? serverTime.toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })
                : "Sincronizando horário com o servidor..."}
            </p>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          style={{ display: "none", position: "absolute" }}
        />
      </div>
    </>
  );
}

export default RegistroPonto;
