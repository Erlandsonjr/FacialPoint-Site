import React, { useState } from "react";
import { FaUser, FaLock, FaCheckCircle } from "react-icons/fa"; 
import { useNavigate } from "react-router-dom";
import "./Login_Cadastro.css";
import LoadingSpinner from "./LoadingSpinner"; 
import ReactDOM from 'react-dom'; 

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
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErro("");
        setCarregando(true);

        if (senha !== confirmarSenha) {
            setErro("As senhas não são iguais. Tente novamente.");
            setCarregando(false);
            return;
        }

        if (!foto) {
            setErro("Por favor, selecione uma foto.");
            setCarregando(false);
            return;
        }

        try {
            // Converte a foto para Base64
            const convertToBase64 = (file) => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = (error) => reject(error);
                });
            };

            const perfilBase64 = await convertToBase64(foto);

            // Envia a foto para o endpoint de codificação
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
                throw new Error("Erro ao gerar a codificação da foto.");
            }

            const codificacao = await responseCodificacao.json();

            // Cria o payload com a foto em Base64 no campo perfil
            const payload = {
                nome: username,
                email,
                senha,
                foto: codificacao,
                perfil: perfilBase64, // Adiciona a imagem em Base64
            };

            // Envia o payload para o endpoint de cadastro
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

    const handleVoltar = () => {
        navigate("/");
    };

    const handleFotoChange = (e) => {
        const arquivo = e.target.files[0];
        if (arquivo) {
            setFoto(arquivo);
            setFotoNome(arquivo.name);
        }
    };

    return (
        <>
            {carregando && <LoadingSpinner message="Processando cadastro..." />}

            <div className={`container ${carregando ? "invisible" : ""}`}>
                {sucesso && ReactDOM.createPortal(
                    <div className="confirmation-overlay">
                        <div className="confirmation-content">
                            <div className="confirmation-icon">
                                <FaCheckCircle size={40} />
                            </div>
                            <p className="confirmation-message">
                                Cadastro realizado com sucesso!
                            </p>
                            <button className="confirmation-button" onClick={handleVoltar}>
                                Voltar para a tela de login
                            </button>
                        </div>
                    </div>,
                    document.body
                )}

                {!carregando && !sucesso && (
                    <form onSubmit={handleSubmit}>
                        <h1>Cadastre-se ao sistema</h1>

                        {erro && <p className="erro">{erro}</p>}

                        <div className="input-field">
                            <input
                                type="text"
                                placeholder="Nome completo"
                                required
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="input-field">
                            <input
                                type="email"
                                placeholder="E-mail"
                                required
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <FaUser className="icon" />
                        </div>
                        <div className="input-field">
                            <input
                                type="password"
                                placeholder="Senha"
                                required
                                value={senha}
                                onChange={(e) => setSenha(e.target.value)}
                            />
                            <FaLock className="icon" />
                        </div>
                        <div className="input-field">
                            <input
                                type="password"
                                placeholder="Confirmar Senha"
                                required
                                value={confirmarSenha}
                                onChange={(e) => setConfirmarSenha(e.target.value)}
                            />
                            <FaLock className="icon" />
                        </div>
                        <div className="input-fieldPhoto">
                            <label htmlFor="foto" className="upload-label">
                                <div className="upload-icon">
                                    <FaUser size={50} />
                                </div>
                                <p>Envie uma foto do rosto</p>
                                <span>Clique aqui ou arraste o arquivo</span>
                            </label>
                            <input
                                id="foto"
                                type="file"
                                accept="image/*"
                                required
                                onChange={handleFotoChange}
                            />
                            {fotoNome && <p className="foto-nome">Foto selecionada: {fotoNome}</p>}
                        </div>
                        <button type="submit">Cadastrar</button>
                    </form>
                )}
            </div>
        </>
    );
}

export default Cadastro;