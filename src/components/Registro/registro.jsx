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
        if (timerAtivo) {
            if (contadorTempo > 0) {
                timerRef.current = setTimeout(() => {
                    setContadorTempo(contadorTempo - 1);
                }, 1000);
            } else {
                tirarFoto();
                setTimerAtivo(false);
            }
        }
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [timerAtivo, contadorTempo]);

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

    const tirarFoto = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Desenhar o vídeo no canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Converter para blob com melhor qualidade
            canvas.toBlob((blob) => {
                setFoto(blob);
            }, 'image/jpeg', 0.95); // Aumentando a qualidade para 95%

            pararCamera();
        }
    };

    const registrarPonto = async () => {
        if (!foto) {
            setErro('Por favor, tire uma foto primeiro.');
            return;
        }

        setCarregando(true);
        setErro('');

        try {
            // Criar FormData com a foto
            const formData = new FormData();
            formData.append('file', foto);

            // Enviar para verificação facial
            const verificacaoResponse = await fetch('https://gerarcodificacaofaceponto-production.up.railway.app/verificar-face', {
                method: 'POST',
                body: formData,
            });

            if (!verificacaoResponse.ok) {
                const errorData = await verificacaoResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro na verificação facial. Tente novamente com melhor iluminação.');
            }

            const verificacaoData = await verificacaoResponse.json();

            // Obter token do localStorage
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Você não está autenticado. Por favor, faça login novamente.');
            }

            // Registrar o ponto
            const registroResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/frequencias/registro', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    verificacao: verificacaoData,
                }),
            });

            if (!registroResponse.ok) {
                const errorData = await registroResponse.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erro ao registrar o ponto. Tente novamente.');
            }

            // Registro bem-sucedido
            setSucesso(true);
            setTimeout(() => {
                setSucesso(false);
                setFoto(null);
            }, 3000);

        } catch (error) {
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
                            <canvas ref={canvasRef} className="foto-canvas" />
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

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </>
    );
}

export default RegistroPonto;