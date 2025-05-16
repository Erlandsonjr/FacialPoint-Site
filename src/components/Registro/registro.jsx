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

  const processarRegistro = async () => {
    try {
      setErro("");

      const token = localStorage.getItem("token");

      if (!token || token === "undefined" || token === "null") {
        setErro("Sessão expirada. Por favor, faça login novamente.");
        setTimeout(resetarParaDeteccao, 5000);
        return;
      }

      if (!foto) {
        setErro("Erro: Foto não capturada.");
        setTimeout(resetarParaDeteccao, 5000);
        return;
      }

      const registroResponse = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/usuarios/me",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!registroResponse.ok) {
        const errorStatus = registroResponse.status;
        if (errorStatus === 401) {
          setErro("Sessão expirada. Por favor, faça login novamente.");
          setTimeout(resetarParaDeteccao, 5000);
          return;
        }
        throw new Error(`Erro ao obter dados do usuário (${errorStatus})`);
      }

      const jsonRegistroResponse = await registroResponse.json();

      if (!jsonRegistroResponse) {
        throw new Error("Resposta vazia do servidor");
      }

      const fotoCampo = jsonRegistroResponse.foto;
      const nomeToken = jsonRegistroResponse.nome;

      if (!fotoCampo) {
        throw new Error(
          "Não há foto cadastrada para este usuário. Contate o administrador."
        );
      }

      if (!nomeToken) {
        throw new Error("Dados de usuário incompletos.");
      }

      let codificacaoArray;
      if (typeof fotoCampo === "string") {
        try {
          codificacaoArray = JSON.parse(fotoCampo);
          if (!Array.isArray(codificacaoArray)) {
            throw new Error("A codificação deve ser um array");
          }
        } catch (e) {
          throw new Error(
            "Formato de codificação facial inválido no banco de dados."
          );
        }
      } else if (Array.isArray(fotoCampo)) {
        codificacaoArray = fotoCampo;
      } else {
        throw new Error("Formato de codificação não suportado");
      }

      const formData = new FormData();
      formData.append("file", foto);

      codificacaoArray.forEach((valor) => {
        formData.append("codificacao", valor);
      });

      const verificacaoResponse = await axios.post(
        "https://faceponto-reconhecimento-facial-production.up.railway.app/reconhecer/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (
        !verificacaoResponse.data.match &&
        !verificacaoResponse.data.success
      ) {
        throw new Error(
          "Não foi possível confirmar sua identidade. Tente novamente."
        );
      }

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

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { erro: errorText || "Erro desconhecido" };
        }

        throw new Error(
          errorData?.erro ||
            errorData?.message ||
            `Erro ao registrar ponto (${resposta.status})`
        );
      }

      const resultado = await resposta.json();
      setSucesso(true);
      setUsuarioReconhecido(nomeToken);
      setModoQuiosque("feedback");
    } catch (error) {
      setErro(error.message || "Erro ao registrar ponto. Tente novamente.");
      setSucesso(false);
      setModoQuiosque("feedback");
    } finally {}
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

  return (
    <>
      {carregando && modoQuiosque !== "processando" && (
        <LoadingSpinner message="Preparando câmera..." />
      )}

      <div className="container-registro">
        <div className={`registro-content${carregando ? " invisible" : ""}`}>
          <div className="registro-header">
            <h1>Registro de Ponto Automático</h1>
            {modoQuiosque === "standby" && (
              <div className="standby-indicator">
                <FaDesktop /> Modo de espera - Aproxime-se para registrar ponto
              </div>
            )}
          </div>

          {erro && modoQuiosque !== "feedback" && (
            <div className="erro-message">
              <p>{erro}</p>
            </div>
          )}

          {modoQuiosque === "feedback" ? (
            <div
              className={`registro-feedback ${
                sucesso ? "registro-sucesso" : "registro-erro"
              }`}
            >
              {sucesso ? (
                <div className="sucesso-message">
                  <FaCheck className="sucesso-icon" />
                  <p>Ponto registrado com sucesso!</p>
                </div>
              ) : (
                <div className="erro-message">
                  <p>{erro || "Erro ao processar reconhecimento facial"}</p>
                </div>
              )}

              {fotoUrl && (
                <div className="foto-capturada">
                  <img
                    src={fotoUrl}
                    alt="Foto capturada"
                    className="foto-preview-image"
                  />
                </div>
              )}

              <div className="usuario-reconhecido">
                <h2>{sucesso ? usuarioReconhecido : "Não reconhecido"}</h2>
                <p>
                  {serverTime ? serverTime.toLocaleTimeString() : "--:--:--"}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={`camera-container ${
                modoQuiosque === "standby" ? "standby-mode" : ""
              }`}
            >
              <div className="camera-frame">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`camera-preview ${
                    modoQuiosque === "standby" ? "dim-video" : ""
                  }`}
                />

                {modoQuiosque === "contagem" && (
                  <div className="timer-overlay">
                    <span className="timer-count">{contadorTempo}</span>
                  </div>
                )}

                <div className="face-overlay">
                  <div
                    className={`face-guide ${
                      faceDetectada ? "face-detected" : ""
                    }`}
                  ></div>
                </div>
              </div>

              <div className="status-info">
                <p>
                  {serverTime
                    ? serverTime.toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })
                    : "Sincronizando horário..."}
                </p>
                <p className="status-text">
                  {modoQuiosque === "detectando" &&
                    "Posicione seu rosto no centro para registrar ponto"}
                  {modoQuiosque === "standby" &&
                    "Aproxime-se para ativar o sistema"}
                  {modoQuiosque === "contagem" && "Prepare-se para a foto"}
                  {modoQuiosque === "processando" && "Processando, aguarde..."}
                </p>
              </div>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </>
  );
}

export default RegistroPonto;