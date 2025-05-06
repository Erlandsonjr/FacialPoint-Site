import React, { useState } from "react";
import { FaUser, FaLock, FaCheckCircle } from "react-icons/fa"; // Adicione FaCheckCircle
import { useNavigate } from "react-router-dom";
import "./Login_Cadastro.css";
import LoadingSpinner from "./LoadingSpinner"; // Importação do componente LoadingSpinner
import ReactDOM from 'react-dom'; // Adicione esta importação no topo do arquivo

function Cadastro() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [cpf, setCpf] = useState("");
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

            const payload = {
                nome: username,
                email,
                senha,
                cpf,
                foto: codificacao, 
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

    const formatarCpf = (valor) => {
        valor = valor.replace(/\D/g, "");

        if (valor.length <= 11) {
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        }

        return valor;
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
                                type="text"
                                placeholder="CPF"
                                required
                                maxLength="14"
                                value={cpf}
                                onChange={(e) => setCpf(formatarCpf(e.target.value))}
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