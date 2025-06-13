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
  const [tipoRegistroAtual, setTipoRegistroAtual] = useState("");
  const [componenteAtivo, setComponenteAtivo] = useState(true);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const feedbackTimerRef = useRef(null);
  const standbyTimerRef = useRef(null);
  const detectionRef = useRef(null);
  const streamRef = useRef(null);
  const componenteMontadoRef = useRef(true);

  const pararTodasCameras = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          if (track) {
            track.stop();
            track.enabled = false;
          }
        });
        streamRef.current = null;
      }

      if (stream) {
        stream.getTracks().forEach(track => {
          if (track) {
            track.stop();
            track.enabled = false;
          }
        });
      }

      if (window.streamRef) {
        if (window.streamRef.getTracks) {
          window.streamRef.getTracks().forEach(track => {
            if (track) {
              track.stop();
              track.enabled = false;
            }
          });
        }
        window.streamRef = null;
      }

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
        videoRef.current.load();
      }

      setStream(null);

      navigator.mediaDevices.enumerateDevices().then(devices => {
        devices.forEach(device => {
          if (device.kind === 'videoinput') {
            navigator.mediaDevices.getUserMedia({
              video: { deviceId: device.deviceId }
            }).then(stream => {
              stream.getTracks().forEach(track => track.stop());
            }).catch(() => {});
          }
        });
      }).catch(() => {});

    } catch (error) {
      console.error("Erro ao parar câmeras:", error);
    }
  };

  useEffect(() => {
    componenteMontadoRef.current = true;
    
    const inicializacao = async () => {
      setCarregando(true);
      try {
        await carregarModelosFaciais();
        await fetchServerTime();
        if (componenteMontadoRef.current) {
          await iniciarCamera();
          setModoQuiosque("detectando");
        }

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", pararTodasCameras);
        window.addEventListener("pagehide", pararTodasCameras);
        window.addEventListener("unload", pararTodasCameras);
        
      } catch (error) {
        setErro(
          "Erro ao inicializar o sistema. Por favor, recarregue a página."
        );
      } finally {
        setCarregando(false);
      }
    };

    setComponenteAtivo(true);
    inicializacao();

    return () => {
      componenteMontadoRef.current = false;
      setComponenteAtivo(false);
      
      pararTodasCameras();
      limparTodosTimers();
      
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", pararTodasCameras);
      window.removeEventListener("pagehide", pararTodasCameras);
      window.removeEventListener("unload", pararTodasCameras);
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!componenteMontadoRef.current) {
        pararTodasCameras();
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      pararTodasCameras();
      if (detectionRef.current) {
        clearInterval(detectionRef.current);
        detectionRef.current = null;
      }
    } else if (document.visibilityState === "visible" && componenteAtivo && componenteMontadoRef.current) {
      setTimeout(() => {
        if (componenteMontadoRef.current && componenteAtivo) {
          iniciarCamera().then(() => {
            if (modoQuiosque === "detectando" || modoQuiosque === "standby") {
              iniciarDeteccaoFacial();
            }
          });
        }
      }, 500);
    }
  };

  const fetchServerTime = async () => {
    try {
      const timeResponse = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/proxy/horario-brasilia"
      );

      if (!timeResponse.ok) {
        throw new Error(`Erro ao obter horário: ${timeResponse.status}`);
      }

      const timeData = await timeResponse.json();

      let serverTime = null;

      if (timeData && timeData.dateTime) {
        serverTime = new Date(timeData.dateTime);
      } else if (timeData && timeData.datetime) {
        serverTime = new Date(timeData.datetime);
      } else if (timeData && timeData.horario) {
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
      if (!componenteAtivo || !componenteMontadoRef.current) return;
      
      try {
        const timeResponse = await fetch(
          `https://faceponto-banco-dados-production.up.railway.app/proxy/horario-brasilia?t=${Date.now()}`
        );

        if (!timeResponse.ok) {
          throw new Error(`Erro ao atualizar horário: ${timeResponse.status}`);
        }

        const timeData = await timeResponse.json();
        let serverTime = null;

        if (timeData && timeData.dateTime) {
          serverTime = new Date(timeData.dateTime);
        } else if (timeData && timeData.datetime) {
          serverTime = new Date(timeData.datetime);
        } else if (timeData && timeData.horario) {
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
      if (!componenteAtivo || !componenteMontadoRef.current) {
        clearInterval(localTimer);
        clearInterval(syncTimer);
        return;
      }
      
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
    if (!componenteMontadoRef.current || !componenteAtivo) return;

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

    if (modoQuiosque === "detectando" && componenteAtivo) {
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
      if (modoQuiosque === "detectando" && componenteAtivo && componenteMontadoRef.current) {
        setModoQuiosque("standby");
      }
    }, 20000);
  };

  useEffect(() => {
    if (modoQuiosque === "contagem") {
    }
    return () => {};
  }, [contadorTempo, modoQuiosque]);

  const iniciarCamera = async () => {
    if (!componenteMontadoRef.current || !componenteAtivo) return false;

    try {
      setErro("");
      pararTodasCameras();
      
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      };

      const streamCamera = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!componenteMontadoRef.current || !componenteAtivo) {
        if (streamCamera) {
          streamCamera.getTracks().forEach(track => track.stop());
        }
        return false;
      }
      
      setStream(streamCamera);
      streamRef.current = streamCamera;
      window.streamRef = streamCamera;

      if (videoRef.current && componenteMontadoRef.current) {
        videoRef.current.srcObject = streamCamera;
        return new Promise((resolve) => {
          videoRef.current.onloadedmetadata = () => {
            if (!componenteMontadoRef.current || !componenteAtivo) {
              pararTodasCameras();
              resolve(false);
              return;
            }
            
            videoRef.current
              .play()
              .then(() => {
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch((e) => {});
                }
                setTimeout(resolve, 1000, true);
              })
              .catch((err) => {
                resolve(false);
              });
          };
          setTimeout(() => {
            if (!componenteMontadoRef.current || !componenteAtivo) {
              pararTodasCameras();
              resolve(false);
              return;
            }
            
            if (videoRef.current && !videoRef.current.onloadedmetadata) {
              videoRef.current.play().catch((e) => {});
              resolve(true);
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
    pararTodasCameras();
  };

  const pararCameraAoSair = () => {
    pararTodasCameras();
    if (detectionRef.current) {
      clearInterval(detectionRef.current);
      detectionRef.current = null;
    }
  };

  const iniciarDeteccaoFacial = () => {
    if (!videoRef.current || !modelsLoaded || !componenteAtivo || !componenteMontadoRef.current) {
      return;
    }

    if (
      !stream ||
      stream
        .getTracks()
        .some((track) => !track.enabled || track.readyState !== "live")
    ) {
      iniciarCamera().then(() => {
        if (componenteAtivo && componenteMontadoRef.current) {
          setTimeout(iniciarDeteccaoFacial, 500);
        }
      });
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

    if (
      videoRef.current &&
      videoRef.current.paused &&
      videoRef.current.srcObject
    ) {
      videoRef.current.play().catch((err) => {});
    }

    detectionRef.current = setInterval(async () => {
      if (!componenteAtivo || !componenteMontadoRef.current) {
        if (detectionRef.current) {
          clearInterval(detectionRef.current);
          detectionRef.current = null;
        }
        return;
      }
      
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
      if (!componenteAtivo || !componenteMontadoRef.current) return;
      setContadorTempo(2);
      setTimeout(() => {
        if (!componenteAtivo || !componenteMontadoRef.current) return;
        setContadorTempo(1);
        setTimeout(() => {
          if (!componenteAtivo || !componenteMontadoRef.current) return;
          setContadorTempo(0);
          setTimeout(() => {
            if (!componenteAtivo || !componenteMontadoRef.current) return;
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
      setCarregando(true);

      if (!foto) {
        setErro("Erro: Foto não capturada.");
        setTimeout(resetarParaDeteccao, 5000);
        return;
      }

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
        throw new Error(
          `Erro ao obter lista de usuários (${usuariosResponse.status})`
        );
      }

      const usuariosData1 = await usuariosResponse.json();

      if (!usuariosData1 || usuariosData1.length === 0) {
        throw new Error("Nenhum usuário cadastrado no sistema.");
      }

      const todasCodificacoes = [];
      const usuariosMap = {};

      usuariosData1.forEach((usuario) => {
        if (usuario.foto) {
          try {
            let codificacao;

            if (typeof usuario.foto === "string") {
              codificacao = JSON.parse(usuario.foto);
            } else if (Array.isArray(usuario.foto)) {
              codificacao = usuario.foto;
            }

            if (Array.isArray(codificacao)) {
              todasCodificacoes.push({
                codificacao: codificacao,
                userId: usuario.id,
              });

              usuariosMap[usuario.id] = usuario;
            }
          } catch (error) {}
        }
      });

      if (todasCodificacoes.length === 0) {
        throw new Error("Nenhum usuário tem codificação facial cadastrada.");
      }

      const formData = new FormData();

      const otimizarImagem = async (blob) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
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

            canvas.toBlob(resolve, "image/jpeg", 0.85);
          };

          img.src = URL.createObjectURL(blob);
        });
      };

      const fotoOtimizada = await otimizarImagem(foto);
      formData.append("file", fotoOtimizada);

      todasCodificacoes.forEach((item) => {
        let encodingArray = item.codificacao;

        if (typeof encodingArray === "string") {
          try {
            encodingArray = JSON.parse(encodingArray);
          } catch (err) {}
        }

        if (Array.isArray(encodingArray)) {
          encodingArray.forEach((valor, idx) => {
            formData.append(`codificacao_${item.userId}_${idx}`, valor);
          });
        }
      });

      const verificacaoResponse = await axios.post(
        "https://faceponto-reconhecimento-facial-production.up.railway.app/reconhecer-multiplos/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (
        !verificacaoResponse.data.match ||
        !verificacaoResponse.data.usuarioId
      ) {
        throw new Error(
          "Rosto não reconhecido. Verifique se você está cadastrado no sistema."
        );
      }

      const usuarioReconhecidoId = verificacaoResponse.data.usuarioId;
      const usuarioReconhecido = usuariosMap[usuarioReconhecidoId];

      if (!usuarioReconhecido) {
        throw new Error("Usuário correspondente não encontrado no sistema.");
      }

      setUsuarioReconhecido(usuarioReconhecido.nome);

      const horarioResponse = await fetch(
        `https://faceponto-banco-dados-production.up.railway.app/public/usuarios/${usuarioReconhecidoId}/horario`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!horarioResponse.ok) {
        try {
          const errorData = await horarioResponse.json();
          throw new Error(
            errorData.erro ||
              `Não foi possível obter o horário de trabalho (${horarioResponse.status})`
          );
        } catch (e) {
          throw new Error(
            `Não foi possível obter o horário de trabalho (${horarioResponse.status})`
          );
        }
      }

      const horarioTrabalho = await horarioResponse.json();

      const dataAtual = serverTime ? new Date(serverTime) : new Date();
      const diasSemana = [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
      ];
      const diaSemanaAtual = diasSemana[dataAtual.getDay()];

      if (
        !horarioTrabalho ||
        !horarioTrabalho[diaSemanaAtual] ||
        !horarioTrabalho[diaSemanaAtual].entrada ||
        !horarioTrabalho[diaSemanaAtual].saida
      ) {
        throw new Error(
          `Você não possui horário de trabalho definido para ${diaSemanaAtual}.`
        );
      }

      const horarioEntrada = horarioTrabalho[diaSemanaAtual].entrada;
      const horarioSaida = horarioTrabalho[diaSemanaAtual].saida;

      const horaAtual = dataAtual.getHours();
      const minutosAtual = dataAtual.getMinutes();
      const totalMinutosAtual = horaAtual * 60 + minutosAtual;

      const [horaEntrada, minEntrada] = horarioEntrada.split(":").map(Number);
      const [horaSaida, minSaida] = horarioSaida.split(":").map(Number);

      const totalMinutosEntrada = horaEntrada * 60 + minEntrada;
      const totalMinutosSaida = horaSaida * 60 + minSaida;

      const entradaInicio = totalMinutosEntrada - 15;
      const entradaFim = totalMinutosEntrada + 15;

      const saidaInicio = totalMinutosSaida - 15;
      const saidaFim = 24 * 60;

      let tipoRegistro = null;

      const formatarHora = (minutos) => {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      };

      if (
        totalMinutosAtual >= entradaInicio &&
        totalMinutosAtual <= entradaFim
      ) {
        tipoRegistro = "entrada";
      } else if (
        totalMinutosAtual >= saidaInicio &&
        totalMinutosAtual <= saidaFim
      ) {
        tipoRegistro = "saida";
      } else {
        setUsuarioReconhecido(usuarioReconhecido.nome);

        let msgEntradaRegistrada = "";

        if (totalMinutosAtual > entradaFim && totalMinutosAtual < saidaInicio) {
          const hoje = dataAtual.toISOString().split("T")[0];

          try {
            const verificaEntradaResponse = await fetch(
              `https://faceponto-banco-dados-production.up.railway.app/frequencias/verifica/${usuarioReconhecidoId}?data=${hoje}&tipo=entrada`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              }
            );

            if (verificaEntradaResponse.ok) {
              const registroEntrada = await verificaEntradaResponse.json();

              if (registroEntrada && registroEntrada.jaRegistrou) {
                throw new Error(
                  `Fora do horário permitido. Seu ponto de entrada já foi registrado hoje. Você poderá registrar a saída a partir de ${formatarHora(
                    saidaInicio
                  )}.`
                );
              } else {
                throw new Error(
                  `Fora do horário permitido. Você não registrou o ponto de entrada hoje e já passou do horário permitido.`
                );
              }
            }
          } catch (e) {
            if (e.message.includes("Fora do horário permitido")) {
              throw e;
            }
          }
        }

        throw new Error(
          `Fora do horário permitido.\n\nEntrada: ${formatarHora(
            entradaInicio
          )} até ${formatarHora(entradaFim)}\nSaída: ${formatarHora(
            saidaInicio
          )} até o final do dia.`
        );
      }

      const hoje = dataAtual.toISOString().split("T")[0];

      const verificaRegistroResponse = await fetch(
        `https://faceponto-banco-dados-production.up.railway.app/frequencias/verifica/${usuarioReconhecidoId}?data=${hoje}&tipo=${tipoRegistro}`,
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
          if (tipoRegistro === "entrada") {
            setErro(
              `Você já registrou seu ponto hoje. Você pode registrar sua saída a partir de ${formatarHora(
                saidaInicio
              )}.`
            );
            sessionStorage.setItem("errorType", "saida-pendente");
          } else {
            setErro(`Você já registrou seu ponto de saída hoje.`);
            sessionStorage.removeItem("errorType");
          }
          setSucesso(false);
          setModoQuiosque("feedback");
          return;
        }
      }

      const dataFormatada = new Date(
        dataAtual.getFullYear(),
        dataAtual.getMonth(),
        dataAtual.getDate(),
        dataAtual.getHours(),
        dataAtual.getMinutes(),
        dataAtual.getSeconds()
      ).toISOString();

      const dadosRegistro = {
        nome: usuarioReconhecido.nome,
        usuario_id: usuarioReconhecidoId,
        data: dataFormatada,
        tipo_registro: tipoRegistro,
      };

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
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const resultado = await resposta.json();

      setTipoRegistroAtual(tipoRegistro);
      setSucesso(true);
      setUsuarioReconhecido(usuarioReconhecido.nome);
      setModoQuiosque("feedback");
    } catch (error) {
      setErro(error.message || "Erro ao registrar ponto. Tente novamente.");
      setSucesso(false);
      setModoQuiosque("feedback");
    } finally {
      setCarregando(false);
    }
  };

  const getKioskToken = async () => {
    try {
      localStorage.removeItem("kioskToken");

      const response = await fetch(
        "https://faceponto-banco-dados-production.up.railway.app/auth/kiosk",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            kioskSecret: "FacePonto2025",
          }),
        }
      );

      if (!response.ok) {
        const status = response.status;
        try {
          const errorData = await response.json();
        } catch (e) {}

        return null;
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      return null;
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
      if (componenteAtivo && componenteMontadoRef.current) {
        resetarParaDeteccao();
      }
    }, 5000);
  };

  const resetarParaDeteccao = () => {
    if (!componenteAtivo || !componenteMontadoRef.current) return;
    
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

      <div className="fullscreen-container">
        <div
          className={`camera-fullscreen ${
            modoQuiosque === "standby" ? "dim-video" : ""
          }`}
        >
          {modoQuiosque !== "feedback" && modoQuiosque !== "processando" ? (
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

        <div className="header-overlay">
          <h1>Registro de Ponto Automático</h1>
        </div>

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

        {modoQuiosque !== "feedback" && (
          <div className="face-overlay">
            <div
              className={`face-guide ${faceDetectada ? "face-detected" : ""}`}
            ></div>
          </div>
        )}

        {modoQuiosque === "contagem" && (
          <div className="timer-overlay">
            <span className="timer-count">{contadorTempo}</span>
          </div>
        )}

        <div className="status-overlay">
          {modoQuiosque === "feedback" ? (
            <>
              {sucesso ? (
                <>
                  <div className="feedback-user">{usuarioReconhecido}</div>
                  <div className="feedback-message success">
                    <FaCheck className="sucesso-icon" /> Ponto de{" "}
                    {tipoRegistroAtual === "entrada" ? "entrada" : "saída"}{" "}
                    registrado com sucesso!
                  </div>
                </>
              ) : erro &&
                (erro.includes("já registrou seu ponto de") ||
                  erro.includes("Fora do horário permitido")) ? (
                <>
                  <div className="feedback-user">{usuarioReconhecido}</div>
                  <div
                    className={
                      erro &&
                      erro.includes(
                        "Você já registrou seu ponto hoje. Você pode registrar sua saída"
                      )
                        ? "feedback-message warning"
                        : erro && erro.includes("Fora do horário permitido")
                        ? "feedback-message warning"
                        : erro && erro.includes("já registrou seu ponto de")
                        ? "feedback-message warning"
                        : "feedback-message error"
                    }
                  >
                    {erro}
                  </div>
                </>
              ) : (
                <>
                  <div className="feedback-user">
                    {usuarioReconhecido || "Não reconhecido"}
                  </div>
                  <div className="feedback-message error">{erro}</div>
                </>
              )}
            </>
          ) : (
            <p className="status-text">
              {modoQuiosque === "detectando" &&
                "Posicione seu rosto no centro para registrar ponto"}
              {modoQuiosque === "standby" &&
                "Aproxime-se para ativar o sistema"}
              {modoQuiosque === "contagem" && "Prepare-se para a foto"}
              {modoQuiosque === "processando" &&
                "Processando reconhecimento facial, aguarde..."}
            </p>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

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