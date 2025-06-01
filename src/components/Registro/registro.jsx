import React, { useState, useRef, useEffect } from "react";
import {
  FaCamera,
  FaCheck,
  FaInfoCircle,
  FaDesktop,
  FaUserCircle,
} from "react-icons/fa";
import "./registro.css";
import LoadingSpinner from "../Login_Cadastro/LoadingSpinner";
import axios from "axios";
import * as faceapi from "face-api.js";

function RegistroPonto() {
  const [stream, setStream] = useState(null);
  const [foto, setFoto] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [usuarioReconhecido, setUsuarioReconhecido] = useState("");
  const [permissaoCamera, setPermissaoCamera] = useState("nao-solicitada");
  const [serverTime, setServerTime] = useState(null);

  const [modoQuiosque, setModoQuiosque] = useState("inicializando");
  const [contadorTempo, setContadorTempo] = useState(0);
  const [faceDetectada, setFaceDetectada] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const standbyTimerRef = useRef(null);
  const detectionRef = useRef(null);

  useEffect(() => {
    const inicializacao = async () => {
      setCarregando(true);
      try {
        await carregarModelosFaciais();
        await fetchServerTime();
        await iniciarCamera();
        setModoQuiosque("detectando");
      } catch (error) {
        setErro(
          "Erro ao inicializar o sistema. Por favor, recarregue a página."
        );
      } finally {
        setCarregando(false);
      }
    };

    inicializacao();

    return () => {
      pararCamera();
      limparTodosTimers();
    };
  }, []);

  const fetchServerTime = async () => {
    try {
      const timeResponse = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/horario-brasilia"
      );

      if (!timeResponse.ok) {
        throw new Error(`Erro ao obter horário: ${timeResponse.status}`);
      }

      const timeData = await timeResponse.json();

      let serverTime = null;

      if (timeData && timeData.horario) {
        serverTime = new Date(timeData.horario);
      } else if (
        timeData &&
        timeData.components &&
        typeof timeData.components.year === "number"
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
      } else if (timeData && timeData.isoString) {
        serverTime = new Date(timeData.isoString);
      } else if (timeData && timeData.timestamp) {
        serverTime = new Date(timeData.timestamp);
      } else {
        throw new Error("Formato de resposta do servidor não reconhecido");
      }

      setServerTime(serverTime);
      iniciarSincronizacaoHorario();

      return serverTime;
    } catch (error) {
      setErro(
        "Não foi possível sincronizar com o horário do servidor. Tentando novamente..."
      );
      return new Date();
    }
  };

  const iniciarSincronizacaoHorario = () => {
    let localTimer;
    let syncTimer;
    let localTime = serverTime || new Date();

    const syncWithServer = async () => {
      try {
        const timeResponse = await fetch(
          `https://faceponto-banco-dados-production.up.railway.app/horario-brasilia?t=${Date.now()}`
        );

        if (!timeResponse.ok) {
          throw new Error(`Erro ao atualizar horário: ${timeResponse.status}`);
        }

        const timeData = await timeResponse.json();
        let serverTime = null;

        if (timeData && timeData.horario) {
          serverTime = new Date(timeData.horario);
        } else if (
          timeData &&
          timeData.components &&
          typeof timeData.components.year === "number"
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
        } else if (timeData && timeData.isoString) {
          serverTime = new Date(timeData.isoString);
        } else if (timeData && timeData.timestamp) {
          serverTime = new Date(timeData.timestamp);
        }

        localTime = serverTime;
        setServerTime(serverTime);
      } catch (err) {}
    };

    const updateLocalTime = () => {
      if (localTime) {
        localTime = new Date(localTime.getTime() + 1000);
        setServerTime(new Date(localTime));
      }
    };

    localTimer = setInterval(updateLocalTime, 1000);
    syncTimer = setInterval(syncWithServer, 30000);

    return () => {
      clearInterval(localTimer);
      clearInterval(syncTimer);
    };
  };

  const carregarModelosFaciais = async () => {
    try {
      try {
        const testeFetch = await fetch(
          "/models/tiny_face_detector_model-weights_manifest.json"
        );
      } catch (e) {}
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      setModelsLoaded(true);
      return true;
    } catch (error) {
      setErro(
        "Erro ao carregar modelos de detecção facial. Tente recarregar a página."
      );
      return false;
    }
  };

  useEffect(() => {
    if (
      modoQuiosque === "contagem" ||
      modoQuiosque === "processando" ||
      modoQuiosque === "feedback"
    ) {
      if (detectionRef.current) {
        clearInterval(detectionRef.current);
        detectionRef.current = null;
      }
    }

    if (modoQuiosque === "detectando") {
      iniciarDeteccaoFacial();
      iniciarTimerStandby();
    } else if (modoQuiosque === "contagem") {
      iniciarContagem();
    } else if (modoQuiosque === "processando") {
      processarRegistro();
    } else if (modoQuiosque === "feedback") {
      iniciarTimerFeedback();
    }
  }, [modoQuiosque]);

  const iniciarTimerStandby = () => {
    if (standbyTimerRef.current) {
      clearTimeout(standbyTimerRef.current);
    }

    standbyTimerRef.current = setTimeout(() => {
      if (modoQuiosque === "detectando") {
        setModoQuiosque("standby");
      }
    }, 20000);
  };

  useEffect(() => {
    if (modoQuiosque === "contagem") {}
    return () => {};
  }, [contadorTempo, modoQuiosque]);

  const iniciarCamera = async () => {
    try {
      setErro("");
      pararCamera();
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      };

      const streamCamera = await navigator.mediaDevices.getUserMedia(
        constraints
      );
      setStream(streamCamera);
      setPermissaoCamera("concedida");

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.srcObject = streamCamera;
        return new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current
              .play()
              .then(() => {
                if (videoRef.current.paused) {
                  videoRef.current
                    .play()
                    .catch((e) => {});
                }
                setTimeout(resolve, 1000);
              })
              .catch((err) => {
                resolve();
              });
          };
          setTimeout(() => {
            if (videoRef.current && !videoRef.current.onloadedmetadata) {
              videoRef.current
                .play()
                .catch((e) => {});
              resolve();
            }
          }, 2000);
        });
      }

      return true;
    } catch (error) {
      setPermissaoCamera("negada");
      setErro(
        "Não foi possível acessar a câmera. Verifique as permissões do navegador."
      );
      return false;
    }
  };

  const pararCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const iniciarDeteccaoFacial = () => {
    if (!videoRef.current || !modelsLoaded || !stream) {
      return;
    }

    if (
      modoQuiosque === "feedback" ||
      modoQuiosque === "contagem" ||
      modoQuiosque === "processando"
    ) {
      return;
    }

    if (detectionRef.current) {
      clearInterval(detectionRef.current);
    }

    detectionRef.current = setInterval(async () => {
      if (modoQuiosque !== "detectando" && modoQuiosque !== "standby") {
        return;
      }

      try {
        if (videoRef.current && videoRef.current.readyState === 4) {
          const detectorOptions = new faceapi.TinyFaceDetectorOptions({
            inputSize: 160,
            scoreThreshold: 0.1,
          });

          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            detectorOptions
          );

          if (detections.length > 0) {
            if (modoQuiosque === "standby") {
              setModoQuiosque("detectando");
            }

            if (verificarPosicaoRosto(detections[0])) {
              clearInterval(detectionRef.current);
              detectionRef.current = null;
              setModoQuiosque("contagem");
            }

            setFaceDetectada(true);
            iniciarTimerStandby();
          } else {
            setFaceDetectada(false);
          }
        }
      } catch (error) {}
    }, 500);

    if (videoRef.current) {
      if (videoRef.current.paused && videoRef.current.srcObject) {
        videoRef.current.play().catch((err) => {});
      }
    }
  };

  const verificarPosicaoRosto = (face) => {
    if (!face || !videoRef.current) return false;
    if (face.score > 0.3) {
      return true;
    }
    return false;
  };

  const iniciarContagem = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setContadorTempo(3);
    setTimeout(() => {
      setContadorTempo(2);
      setTimeout(() => {
        setContadorTempo(1);
        setTimeout(() => {
          setContadorTempo(0);
          setTimeout(() => {
            tirarFoto();
          }, 200);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [contadorTempo]);

  const tirarFoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setErro("Erro ao capturar imagem: referências não encontradas");
      resetarParaDeteccao();
      return;
    }

    try {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");

        if (!context) {
          setErro("Erro ao processar imagem");
          resetarParaDeteccao();
          return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageUrl = canvas.toDataURL("image/jpeg", 0.9);
        setFotoUrl(imageUrl);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              setFoto(blob);
              setModoQuiosque("processando");
            } else {
              setErro("Erro ao processar a imagem");
              resetarParaDeteccao();
            }
          },
          "image/jpeg",
          0.9
        );
      } else {
        setErro("Erro ao capturar imagem: vídeo não está pronto");
        resetarParaDeteccao();
      }
    } catch (error) {
      setErro("Ocorreu um erro ao capturar a foto");
      resetarParaDeteccao();
    }
  };

  const getKioskToken = async () => {
    try {
      // Verificar se já temos um token de quiosque no localStorage
      let kioskToken = localStorage.getItem('kioskToken');
      
      // Se não tiver token ou estiver perto de expirar, obter novo
      if (!kioskToken) {
        const response = await fetch(
          "https://faceponto-banco-dados-production.up.railway.app/auth/kiosk",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              kioskSecret: "chave_secreta_do_quiosque_definida_no_ambiente" // Idealmente, isso viria do .env local
            }),
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          kioskToken = data.token;
          localStorage.setItem('kioskToken', kioskToken);
        } else {
          throw new Error("Falha na autenticação do quiosque");
        }
      }
      
      return kioskToken;
    } catch (error) {
      console.error("Erro ao obter token do quiosque:", error);
      setErro("Erro de autenticação do quiosque. Contate o administrador.");
      return null;
    }
  };

  const processarRegistro = async () => {
    try {
      setErro("");
      setCarregando(true);

      // Validar foto
      if (!foto) {
        setErro("Erro: Foto não capturada.");
        setTimeout(resetarParaDeteccao, 5000);
        return;
      }

      console.log("Iniciando processo de reconhecimento facial");

      // 1. Obter lista de usuários cadastrados com suas codificações faciais
      // Usar endpoint público temporariamente para desbloquer o desenvolvimento
      console.log("Obtendo lista de usuários...");
      const usuariosResponse = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/public/usuarios/codificacoes",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!usuariosResponse.ok) {
        throw new Error(`Erro ao obter lista de usuários (${usuariosResponse.status})`);
      }

      const usuariosData = await usuariosResponse.json();
      console.log(`${usuariosData.length} usuários encontrados.`);

      if (!usuariosData || usuariosData.length === 0) {
        throw new Error("Nenhum usuário cadastrado no sistema.");
      }

      // 2. Preparar todas as codificações para reconhecimento
      const todasCodificacoes = [];
      const usuariosMap = {};
      
      usuariosData.forEach(usuario => {
        if (usuario.foto) {
          try {
            let codificacao;
            
            if (typeof usuario.foto === "string") {
              codificacao = JSON.parse(usuario.foto);
            } else if (Array.isArray(usuario.foto)) {
              codificacao = usuario.foto;
            }
            
            if (Array.isArray(codificacao)) {
              // Adicionar a codificação à lista de todas as codificacoes
              todasCodificacoes.push({
                codificacao: codificacao,
                userId: usuario.id
              });
              
              // Manter mapeamento de ID para dados completos do usuário
              usuariosMap[usuario.id] = usuario;
            }
          } catch (error) {
            console.warn(`Codificação inválida para usuário ${usuario.id}: ${error.message}`);
          }
        }
      });

      if (todasCodificacoes.length === 0) {
        throw new Error("Nenhum usuário tem codificação facial cadastrada.");
      }

      console.log(`${todasCodificacoes.length} codificações faciais válidas encontradas.`);

      // 3. Enviar foto para reconhecimento contra todas as codificações
      console.log("Enviando para reconhecimento facial...");
      const formData = new FormData();
      
      // Otimizar o tamanho da imagem antes do envio
      const otimizarImagem = async (blob) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            // Aumentar para 600x450px para melhor qualidade
            const maxWidth = 600;
            const maxHeight = 450;
            
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
            
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            
            // Aumentar a qualidade para 0.85 (era 0.7)
            canvas.toBlob(resolve, "image/jpeg", 0.85);
          };
          
          img.src = URL.createObjectURL(blob);
        });
      };

      // Antes de enviar o arquivo
      const fotoOtimizada = await otimizarImagem(foto);
      formData.append("file", fotoOtimizada);
      
      // Enviar todas as codificações com identificação do usuário correspondente
      todasCodificacoes.forEach((item) => {
        // Verificar se a codificação é uma string JSON
        let encodingArray = item.codificacao;
        
        // Se for uma string JSON, parsear para array
        if (typeof encodingArray === 'string') {
          try {
            encodingArray = JSON.parse(encodingArray);
          } catch (err) {
            console.warn(`Erro ao parsear codificação: ${err.message}`);
          }
        }
        
        // Verificar se agora temos um array
        if (Array.isArray(encodingArray)) {
          // Enviar cada elemento do array individualmente como elemento da codificação
          encodingArray.forEach((valor, idx) => {
            formData.append(`codificacao_${item.userId}_${idx}`, valor);
          });
          console.log(`Enviado ${encodingArray.length} elementos para usuário ${item.userId}`);
        } else {
          console.warn(`Codificação inválida para usuário ${item.userId}`);
        }
      });

      // Adicionar inspeção de dados antes do post axios
      console.log("Enviando codificações para reconhecimento:");
      todasCodificacoes.forEach(item => {
        console.log(`Usuário ${item.userId}: ${typeof item.codificacao}`, 
          Array.isArray(item.codificacao) ? 
            `Array com ${item.codificacao.length} elementos` : 
            item.codificacao
        );
      });

      // Ver o que está sendo enviado no FormData
      const formEntries = [...formData.entries()];
      console.log("Entradas do FormData:", formEntries.slice(0, 10));

      // Enviar para API de reconhecimento
      const verificacaoResponse = await axios.post(
        "https://faceponto-reconhecimento-facial-production.up.railway.app/reconhecer-multiplos/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Resposta do reconhecimento facial:", verificacaoResponse.data);

      if (!verificacaoResponse.data.match || !verificacaoResponse.data.usuarioId) {
        throw new Error("Rosto não reconhecido. Verifique se você está cadastrado no sistema.");
      }

      const usuarioReconhecidoId = verificacaoResponse.data.usuarioId;
      const usuarioReconhecido = usuariosMap[usuarioReconhecidoId];
      
      if (!usuarioReconhecido) {
        throw new Error("Usuário correspondente não encontrado no sistema.");
      }

      // 4. Verificar se o usuário já registrou ponto hoje
      const hoje = new Date().toISOString().split('T')[0];
      const verificaRegistroResponse = await fetch(
        `https://faceponto-banco-dados-production.up.railway.app/frequencias/verifica/${usuarioReconhecidoId}?data=${hoje}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (verificaRegistroResponse.ok) {
        const registroExistente = await verificaRegistroResponse.json();
        
        if (registroExistente && registroExistente.jaRegistrou) {
          setUsuarioReconhecido(usuarioReconhecido.nome);
          setErro(`${usuarioReconhecido.nome} já registrou seu ponto hoje.`);
          setSucesso(false);
          setModoQuiosque("feedback");
          return;
        }
      }

      // 5. Registrar ponto para o usuário reconhecido
      console.log("Registrando ponto para:", usuarioReconhecido.nome);
      const dataAtual = serverTime ? new Date(serverTime) : new Date();
      const dataFormatada = dataAtual.toISOString();

      const dadosRegistro = {
        nome: usuarioReconhecido.nome,
        usuario_id: usuarioReconhecidoId,
        data: dataFormatada,
        tipo_registro: "entrada", 
      };

      console.log("Enviando dados para registro:", dadosRegistro);

      const resposta = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/frequencias/registrar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dadosRegistro),
        }
      );

      if (!resposta.ok) {
        let errorMsg = `Erro ao registrar ponto (${resposta.status})`;
        try {
          const errorText = await resposta.text();
          const errorData = JSON.parse(errorText);
          errorMsg = errorData?.erro || errorData?.message || errorMsg;
        } catch (e) {
          // Continuar com a mensagem padrão
        }
        throw new Error(errorMsg);
      }

      const resultado = await resposta.json();
      console.log("Registro concluído com sucesso:", resultado);
      
      setSucesso(true);
      setUsuarioReconhecido(usuarioReconhecido.nome);
      setModoQuiosque("feedback");
    } catch (error) {
      console.error("Erro no processo de registro:", error);
      setErro(error.message || "Erro ao registrar ponto. Tente novamente.");
      setSucesso(false);
      setModoQuiosque("feedback");
    } finally {
      setCarregando(false);
    }
  };

  const iniciarTimerFeedback = () => {
    if (detectionRef.current) {
      clearInterval(detectionRef.current);
      detectionRef.current = null;
    }

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }

    feedbackTimerRef.current = setTimeout(() => {
      resetarParaDeteccao();
    }, 5000);
  };

  const resetarParaDeteccao = () => {
    setSucesso(false);
    setErro("");
    setUsuarioReconhecido("");
    setFoto(null);
    setFotoUrl(null);
    setFaceDetectada(false);
    setModoQuiosque("detectando");
    if (
      videoRef.current &&
      videoRef.current.paused &&
      videoRef.current.srcObject
    ) {
      videoRef.current.play().catch((err) => {
        setTimeout(() => {
          pararCamera();
          iniciarCamera();
        }, 500);
      });
    } else if (!videoRef.current || !videoRef.current.srcObject) {
      setTimeout(() => {
        iniciarCamera();
      }, 500);
    }
  };

  const limparTodosTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (standbyTimerRef.current) clearTimeout(standbyTimerRef.current);
    if (detectionRef.current) clearInterval(detectionRef.current);
  };

  const forcarDeteccao = () => {
    setFaceDetectada(true);
    if (detectionRef.current) clearInterval(detectionRef.current);
    setModoQuiosque("contagem");
  };

  // Modifique o return do componente RegistroPonto para adicionar uma classe adaptável
  return (
    <>
      {carregando && modoQuiosque !== "processando" && (
        <LoadingSpinner message="Preparando câmera..." />
      )}

      <div className="fullscreen-container">
        {/* Câmera em tela cheia */}
        <div className={`camera-fullscreen ${modoQuiosque === "standby" ? "dim-video" : ""}`}>
          {modoQuiosque !== "feedback" ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-fullscreen-video"
            />
          ) : (
            <img
              src={fotoUrl}
              alt="Foto capturada"
              className="foto-fullscreen"
            />
          )}
        </div>

        {/* Sobreposições - sempre visíveis */}
        <div className="header-overlay">
          <h1>Registro de Ponto Automático</h1>
          {modoQuiosque === "standby" && (
            <div className="standby-indicator">
              <FaDesktop /> Aproxime-se para registrar ponto
            </div>
          )}
        </div>

        {/* Horário sobreposto */}
        <div className="time-overlay">
          {serverTime
            ? serverTime.toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            : "Sincronizando..."}
        </div>

        {/* Guia de face */}
        {modoQuiosque !== "feedback" && (
          <div className="face-overlay">
            <div className={`face-guide ${faceDetectada ? "face-detected" : ""}`}></div>
          </div>
        )}

        {/* Contagem regressiva */}
        {modoQuiosque === "contagem" && (
          <div className="timer-overlay">
            <span className="timer-count">{contadorTempo}</span>
          </div>
        )}

        {/* Status e informações */}
        <div className="status-overlay">
          {modoQuiosque === "feedback" ? (
            // Resultados do reconhecimento facial
            <>
              {sucesso ? (
                <>
                  <div className="feedback-user">{usuarioReconhecido}</div>
                  <div className="feedback-message success">
                    <FaCheck className="sucesso-icon" /> Ponto registrado com sucesso!
                  </div>
                </>
              ) : erro && erro.includes("já registrou seu ponto hoje") ? (
                <>
                  <div className="feedback-user">{usuarioReconhecido}</div>
                  <div className="feedback-message warning">
                    Você já registrou seu ponto hoje. Retorne amanhã.
                  </div>
                </>
              ) : (
                <>
                  <div className="feedback-user">Não reconhecido</div>
                  <div className="feedback-message error">
                    {erro}
                    {erro && erro.includes("não reconhecido") && (
                      <p className="erro-dica">
                        Solicite ao administrador que cadastre sua foto.
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            // Status de detecção/processamento
            <p className="status-text">
              {modoQuiosque === "detectando" && "Posicione seu rosto no centro para registrar ponto"}
              {modoQuiosque === "standby" && "Aproxime-se para ativar o sistema"}
              {modoQuiosque === "contagem" && "Prepare-se para a foto"}
              {modoQuiosque === "processando" && "Processando, aguarde..."}
            </p>
          )}
        </div>

        {/* Placeholder invisível para o canvas usado para capturar a foto */}
        <canvas ref={canvasRef} style={{ display: "none" }} />
        
        {/* Debug panel - somente visível quando debugMode é true */}
        {debugMode && (
          <div className="debug-panel">
            <h4>Debug</h4>
            <button 
              className="debug-button" 
              onClick={async () => {
                const response = await fetch(
                  "https://faceponto-reconhecimento-facial-production.up.railway.app/status"
                );
                const status = await response.json();
                console.log("Status do serviço:", status);
                alert("Veja o console para detalhes do serviço.");
              }}
            >
              API
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default RegistroPonto;