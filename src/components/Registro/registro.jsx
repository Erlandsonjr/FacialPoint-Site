import React, { useState, useRef, useEffect } from 'react';
import { FaCamera, FaCheck, FaRedo, FaInfoCircle, FaRegLightbulb } from 'react-icons/fa';
import './registro.css';
import LoadingSpinner from '../Login_Cadastro/LoadingSpinner';

function RegistroPonto() {
    const [stream, setStream] = useState(null);
    const [foto, setFoto] = useState(null);
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [mostrarDicas, setMostrarDicas] = useState(false);
    const [permissaoCamera, setPermissaoCamera] = useState('nao-solicitada');
    const [contadorTempo, setContadorTempo] = useState(0);
    const [timerAtivo, setTimerAtivo] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
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

    const iniciarCamera = async () => {
        try {
            setErro('');
            setPermissaoCamera('nao-solicitada');
            
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user"
                }
            };
            
            const streamCamera = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(streamCamera);
            setPermissaoCamera('concedida');
            
            if (videoRef.current) {
                videoRef.current.srcObject = streamCamera;
                await videoRef.current.play().catch(err => {
                    console.error("Erro ao iniciar reprodução de vídeo:", err);
                });
            }
        } catch (error) {
            console.error("Erro ao acessar câmera:", error);
            setPermissaoCamera('negada');
            setErro('Não foi possível acessar sua câmera. Por favor, verifique as permissões do navegador e tente novamente.');
        }
    };

    const pararCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const iniciarContagem = () => {
        setContadorTempo(3);
        setTimerAtivo(true);
    };

    // Função melhorada para capturar a foto
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
            // Certifique-se de que o canvas existe e tem dimensões válidas
            if (video.videoWidth && video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                const context = canvas.getContext('2d');
                if (!context) {
                    console.error("Erro ao obter contexto 2d do canvas");
                    setErro("Erro ao processar imagem");
                    return;
                }
                
                // Desenhe o quadro atual do vídeo no canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Tente converter para blob
                try {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            console.log('Foto capturada com sucesso:', blob.size, 'bytes');
                            setFoto(blob);
                            pararCamera(); // Pare a câmera somente após a foto ser capturada com sucesso
                        } else {
                            console.error("Blob gerado é nulo");
                            setErro("Erro ao processar a imagem capturada");
                        }
                    }, 'image/jpeg', 0.9);
                } catch (blobError) {
                    console.error("Erro ao gerar blob:", blobError);
                    
                    // Alternativa: tente usar dataURL se o blob falhar
                    try {
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                        console.log("DataURL gerado:", dataUrl.substring(0, 50) + "...");
                        
                        // Converter dataURL para blob manualmente
                        const byteString = atob(dataUrl.split(',')[1]);
                        const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
                        const ab = new ArrayBuffer(byteString.length);
                        const ia = new Uint8Array(ab);
                        
                        for (let i = 0; i < byteString.length; i++) {
                            ia[i] = byteString.charCodeAt(i);
                        }
                        
                        const manualBlob = new Blob([ab], {type: mimeString});
                        setFoto(manualBlob);
                        pararCamera();
                    } catch (dataUrlError) {
                        console.error("Também falhou ao usar dataURL:", dataUrlError);
                        setErro("Não foi possível processar a imagem");
                    }
                }
            } else {
                console.error("Dimensões do vídeo não disponíveis:", video.videoWidth, video.videoHeight);
                setErro("Erro ao capturar imagem: vídeo não está pronto");
            }
        } catch (error) {
            console.error("Erro geral ao tirar foto:", error);
            setErro("Ocorreu um erro ao capturar a foto. Por favor, tente novamente.");
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
                setTimerAtivo(false); // Desative o timer antes de tirar a foto
                tirarFoto(); // Tire a foto quando o contador chegar a zero
            }
        }
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [timerAtivo, contadorTempo]);

    const registrarPonto = async () => {
        // Verifique o token no console para debug
        const token = localStorage.getItem('token');
        console.log("Token atual:", token);

        // Se não houver token ou estiver vazio
        if (!token || token === 'undefined' || token === 'null') {
            // Redirecionar para login
            window.location.href = '/';
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        if (!foto) {
            setErro('Por favor, tire uma foto primeiro.');
            return;
        }

        setCarregando(true);
        setErro('');

        try {
            // Obter token do localStorage
            const token = localStorage.getItem('token');
            console.log("Token atual:", token?.substring(0, 10) + "...");
            
            if (!token || token === 'undefined' || token === 'null') {
                // Redirecionar para login automaticamente
                setTimeout(() => window.location.href = '/', 3000);
                throw new Error('Sessão expirada. Por favor, faça login novamente.');
            }
            
            // Buscar dados do usuário
            const registroResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/usuarios/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }).catch(networkError => {
                console.error("Erro de rede:", networkError);
                throw new Error('Erro de conexão com o servidor. Verifique sua internet.');
            });
            
            // Mostrar status da resposta para debug
            console.log("Status da resposta:", registroResponse.status);
            
            if (!registroResponse.ok) {
                const errorData = await registroResponse.json().catch(() => ({}));
                if (registroResponse.status === 401) {
                    localStorage.removeItem('token');
                    setTimeout(() => window.location.href = '/', 3000);
                    throw new Error('Sessão expirada. Redirecionando para login...');
                }
                throw new Error(errorData?.message || `Erro no servidor (${registroResponse.status}). Tente novamente.`);
            }
            
            // Adicione tratamento de erro para o JSON
            let jsonRegistroResponse;
            try {
                jsonRegistroResponse = await registroResponse.json();
                // Verifique se a resposta contém dados válidos
                if (!jsonRegistroResponse) {
                    throw new Error("Resposta vazia do servidor");
                }
            } catch (jsonError) {
                console.error("Erro ao processar JSON:", jsonError);
                throw new Error("Erro ao processar resposta do servidor. Formato inválido.");
            }
            
            // Verifique se os campos necessários existem
            const fotoCampo = jsonRegistroResponse.foto;
            if (!fotoCampo) {
                throw new Error("Não há foto cadastrada para este usuário. Contate o administrador.");
            }
            
            const nomeToken = jsonRegistroResponse.nome;
            if (!nomeToken) {
                throw new Error("Dados de usuário incompletos. Nome não encontrado.");
            }
            
            // Preparar dados para verificação facial
            const formData = new FormData();
            formData.append('file', foto);
            formData.append('codificacao', fotoCampo);

            // Enviar para verificação facial
            const verificacaoResponse = await fetch('https://faceponto-reconhecimento-facial-production.up.railway.app/reconhecer', {
                method: 'POST',
                body: formData,
            });

            if (!verificacaoResponse.ok) {
                const errorData = await verificacaoResponse.json().catch(() => ({}));
                throw new Error(errorData?.message || 'Erro na verificação facial. Tente novamente com melhor iluminação.');
            }
            
            const verificacaoData = await verificacaoResponse.json();
            
            // Verificar resultado da comparação facial
            if (!verificacaoData.match) {
                throw new Error('Não foi possível confirmar sua identidade. Por favor, tente novamente.');
            }
            
            // Registrar frequência
            const resposta = await fetch('https://faceponto-banco-dados-production.up.railway.app/usuarios/me/frequencia', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    nome: nomeToken,
                    data: new Date(),
                    horario: new Date()
                }),
            });
            
            if (!resposta.ok) {
                const errorData = await resposta.json().catch(() => ({}));
                throw new Error(errorData?.message || 'Erro ao registrar frequência. Tente novamente.');
            }
            
            const resultado = await resposta.json();
            console.log('Frequência registrada com sucesso:', resultado);

            // Registro bem-sucedido
            setSucesso(true);
            setTimeout(() => {
                setSucesso(false);
                setFoto(null);
            }, 3000);

        } catch (error) {
            console.error("Detalhe do erro:", error);
            setErro(error.message || 'Ocorreu um erro durante o registro. Tente novamente.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <>
            {carregando && <LoadingSpinner message="Processando seu registro..." />}
            <div className={`registro-content registro-fullscreen${carregando ? ' invisible' : ''}`}>
                <div className="registro-header">
                    <h1>Registro de Ponto</h1>
                    <button 
                        className="dicas-button" 
                        onClick={() => setMostrarDicas(!mostrarDicas)}
                        aria-label="Mostrar dicas para foto"
                    >
                        <FaRegLightbulb />
                        {mostrarDicas ? 'Ocultar dicas' : 'Dicas para foto'}
                    </button>
                </div>

                {mostrarDicas && (
                    <div className="dicas-container">
                        <h3><FaInfoCircle /> Como tirar uma boa foto para reconhecimento</h3>
                        <ul>
                            <li>Posicione seu rosto no centro da câmera</li>
                            <li>Certifique-se de que seu rosto esteja bem iluminado</li>
                            <li>Evite usar chapéus, óculos escuros ou máscaras</li>
                            <li>Mantenha uma expressão neutra</li>
                            <li>Olhe diretamente para a câmera</li>
                        </ul>
                    </div>
                )}

                {erro && <div className="erro-message"><p>{erro}</p></div>}
                
                {sucesso && (
                    <div className="sucesso-message">
                        <FaCheck className="sucesso-icon" />
                        <p>Ponto registrado com sucesso!</p>
                    </div>
                )}

                <div className="camera-container">
                    {!foto && !stream && permissaoCamera !== 'negada' && (
                        <div className="camera-start">
                            <button className="camera-button" onClick={iniciarCamera}>
                                <FaCamera />
                                Iniciar Câmera
                            </button>
                            <p className="camera-info">Clique para ativar sua câmera e registrar seu ponto</p>
                        </div>
                    )}

                    {permissaoCamera === 'negada' && (
                        <div className="permissao-negada">
                            <FaInfoCircle size={40} />
                            <h3>Permissão para câmera negada</h3>
                            <p>Para registrar seu ponto, você precisa permitir o acesso à câmera nas configurações do seu navegador.</p>
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

                    {foto && (
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
                    <p>{new Date().toLocaleString()}</p>
                </div>
            </div>
            <canvas ref={canvasRef} style={{ display: 'none', position: 'absolute' }} />
        </>
    );
}

export default RegistroPonto;