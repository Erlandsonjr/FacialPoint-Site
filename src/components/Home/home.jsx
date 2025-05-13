import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaRegClock, FaSignOutAlt, FaChartBar } from 'react-icons/fa';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, LinearScale, BarElement, CategoryScale, Tooltip, Legend, Title } from 'chart.js';
import './home.css';

ChartJS.register(LinearScale, BarElement, CategoryScale, Tooltip, Legend, Title);

function Home() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [chartLabels, setChartLabels] = useState([]);
    const [chartKey, setChartKey] = useState(0);
    const [currentServerTime, setCurrentServerTime] = useState(null);
    const navigate = useNavigate();

    // Adicione uma ref para controlar se os dados já foram carregados
    const userDataFetched = React.useRef(false);

    const userDisplayName = React.useMemo(() => {
        if (!userData) return 'Usuário';
        if (userData.nome) return userData.nome;
        
        const storedName = localStorage.getItem('userName');
        if (storedName) return storedName;
        
        return 'Usuário';
    }, [userData]); // Recalcula apenas quando userData mudar

    useEffect(() => {
        const fetchUserData = async () => {
            // Evita requisições repetidas
            if (userDataFetched.current) {
                console.log("Dados do usuário já foram carregados, ignorando nova requisição");
                return;
            }

            try {
                // Obter horário oficial de Brasília do próprio backend
                const timeResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/horario-brasilia');
                
                if (!timeResponse.ok) {
                    throw new Error(`Erro ao obter horário inicial: ${timeResponse.status}`);
                }
                
                const timeData = await timeResponse.json();
                console.log("Resposta do servidor (horário):", timeData);

                // Verificação mais robusta do formato da resposta
                let serverTime = null;
                
                // Depuração detalhada dos campos
                console.log("Campos disponíveis:", {
                    hasComponents: timeData && typeof timeData.components !== 'undefined',
                    components: timeData?.components,
                    hasIsoString: timeData && typeof timeData.isoString !== 'undefined',
                    isoString: timeData?.isoString,
                    hasTimestamp: timeData && typeof timeData.timestamp !== 'undefined',
                    timestamp: timeData?.timestamp,
                });

                // Prioridade 1: Usar components se disponível e válido
                if (timeData && timeData.components && 
                    typeof timeData.components.year === 'number' && 
                    typeof timeData.components.month === 'number') {
                    
                    const components = timeData.components;
                    serverTime = new Date(
                        components.year,
                        components.month - 1, // Converter mês baseado em 1 para baseado em 0
                        components.day,
                        components.hour,
                        components.minute,
                        components.second
                    );
                    console.log('Horário criado a partir de components:', serverTime);
                }
                // Prioridade 2: Usar isoString se disponível e válido
                else if (timeData && timeData.isoString && typeof timeData.isoString === 'string') {
                    serverTime = new Date(timeData.isoString);
                    console.log('Horário criado a partir de isoString:', serverTime);
                }
                // Prioridade 3: Usar timestamp se disponível e válido
                else if (timeData && timeData.timestamp && typeof timeData.timestamp === 'number') {
                    serverTime = new Date(timeData.timestamp);
                    console.log('Horário criado a partir de timestamp:', serverTime);
                }
                // Prioridade 4: Se não encontrar formato conhecido mas tiver dados, use como fallback
                else if (timeData) {
                    console.warn('Formato não reconhecido, tentando usar qualquer dado disponível:', timeData);
                    
                    // Tentar usar a resposta diretamente
                    if (typeof timeData === 'string') {
                        serverTime = new Date(timeData);
                    }
                    // Tentar como se fosse um objeto Date serializado
                    else if (timeData.toISOString || timeData.getTime) {
                        serverTime = new Date(timeData.toISOString ? timeData.toISOString() : timeData.getTime());
                    } 
                    // Último recurso: usar data atual
                    else {
                        console.warn('Usando horário local como fallback');
                        serverTime = new Date();
                    }
                }
                else {
                    throw new Error('Formato de resposta do servidor não reconhecido');
                }

                if (!serverTime || isNaN(serverTime.getTime())) {
                    console.error("Data inválida criada:", serverTime);
                    throw new Error("Não foi possível criar um objeto Date válido");
                }

                setCurrentServerTime(serverTime);
                console.log('Horário inicial obtido do servidor:', serverTime);
                
                // Continuar com o restante do código...
            } catch (error) {
                console.error('Erro crítico ao obter horário inicial:', error);
                console.warn('Usando horário local como fallback de emergência');
                setCurrentServerTime(new Date()); // Usar horário local como fallback de emergência
                // Continue com a execução mesmo com erro para não bloquear completamente o usuário
            }
            
            // Resto do código existente...
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    navigate('/');
                    return;
                }
                
                const tokenParts = token.split('.');
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log("Token payload:", payload);
                
                // Limite a uma única abordagem para obter dados do usuário
                // (em vez de tentar múltiplos endpoints)
                try {
                    const userResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/usuarios/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        console.log("Dados de usuário obtidos com sucesso:", userData);
                        setUserData(userData);
                    } else {
                        console.warn("Erro ao obter dados do usuário. Usando informações do token.");
                        const defaultUser = {
                            email: payload.email,
                            _id: payload._id,
                            nome: localStorage.getItem('userName') || 'Usuário'  
                        };
                        setUserData(defaultUser);
                    }
                    
                    // Marcar que os dados foram carregados
                    userDataFetched.current = true;
                } catch (error) {
                    console.error("Erro ao buscar dados de usuário:", error);
                    const defaultUser = {
                        email: payload.email,
                        _id: payload._id,
                        nome: localStorage.getItem('userName') || 'Usuário' 
                    };
                    setUserData(defaultUser);
                    userDataFetched.current = true;
                }
                
                // Adicione parâmetros para evitar cache
                const timestamp = Date.now();
                const attendanceResponse = await fetch(`https://faceponto-banco-dados-production.up.railway.app/frequencias/minhas?nocache=${timestamp}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                
                if (!attendanceResponse.ok) {
                    if (attendanceResponse.status === 404) {
                        console.log("Usuário sem registros de frequência ainda");
                        processAttendanceData([]);
                        return;
                    }
                    
                    if (attendanceResponse.status === 401 || attendanceResponse.status === 403) {
                        localStorage.removeItem('token');
                        navigate('/');
                        return;
                    }
                    
                    try {
                        const errorData = await attendanceResponse.json();
                        console.log("Erro detalhado:", errorData);
                        
                        if (errorData.erro && errorData.erro.includes("não encontrado") || 
                            errorData.erro && errorData.erro.includes("frequência")) {
                            console.log("Usuário provavelmente não tem registros ainda");
                            processAttendanceData([]);
                            return;
                        }
                        
                        throw new Error(`Erro ao carregar frequências: ${errorData.erro}`);
                    } catch (jsonError) {
                        processAttendanceData([]);
                        setError("Não foi possível carregar seu histórico de frequências. Registre seu primeiro ponto para começar.");
                    }
                    return;
                }
                
                const attendanceData = await attendanceResponse.json();
                console.log("Dados de frequência recebidos:", attendanceData);
                
                processAttendanceData(attendanceData);
                
            } catch (error) {
                console.error('Erro:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchUserData();
    }, [navigate]);
    
    useEffect(() => {
        const handleResize = () => {
            setChartKey(prev => prev + 1);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    useEffect(() => {
        let localTimer;
        let syncTimer;
        let localTime = null;
        
        // Função para sincronizar com o servidor
        const syncWithServer = async () => {
            try {
                // Adicionar parâmetro para evitar cache
                const timeResponse = await fetch(`https://faceponto-banco-dados-production.up.railway.app/horario-brasilia?t=${Date.now()}`);
                
                if (!timeResponse.ok) {
                    throw new Error(`Erro ao atualizar horário: ${timeResponse.status}`);
                }
                
                const timeData = await timeResponse.json();
                console.log("Atualização de horário recebida:", timeData);
                
                let serverTime = null;
                
                // Prioridade 1: Usar o formato antigo com horario
                if (timeData && timeData.horario) {
                    serverTime = new Date(timeData.horario);
                    console.log('Horário sincronizado do servidor:', serverTime);
                }
                // Prioridade 2: Usar components se disponível
                else if (timeData && timeData.components && 
                    typeof timeData.components.year === 'number' && 
                    typeof timeData.components.month === 'number') {
                    
                    const components = timeData.components;
                    serverTime = new Date(
                        components.year,
                        components.month - 1,
                        components.day,
                        components.hour,
                        components.minute,
                        components.second
                    );
                    console.log('Horário criado a partir de components:', serverTime);
                }
                // Prioridade 3: Usar isoString se disponível
                else if (timeData && timeData.isoString && typeof timeData.isoString === 'string') {
                    serverTime = new Date(timeData.isoString);
                    console.log('Horário criado a partir de isoString:', serverTime);
                }
                // Prioridade 4: Usar timestamp se disponível
                else if (timeData && timeData.timestamp && typeof timeData.timestamp === 'number') {
                    serverTime = new Date(timeData.timestamp);
                    console.log('Horário criado a partir de timestamp:', serverTime);
                } else {
                    throw new Error('Formato de resposta do servidor não reconhecido');
                }
                
                // Atualizar o horário local com o do servidor
                localTime = serverTime;
                setCurrentServerTime(serverTime);
            } catch (err) {
                console.error('Erro ao atualizar horário do servidor:', err);
                // Não mostra erro na interface para não sobrecarregar com mensagens
            }
        };
        
        // Função para incrementar o horário localmente a cada segundo
        const updateLocalTime = () => {
            if (localTime) {
                // Incrementa o horário local em 1 segundo
                localTime = new Date(localTime.getTime() + 1000);
                setCurrentServerTime(new Date(localTime));
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
    
    // Modifique a função processAttendanceData para melhor compatibilidade com sua API
    const processAttendanceData = async (data) => {
        // Adicione logo no início da função processAttendanceData para verificar o registro mencionado:
        const specificRecord = data.find(item => 
            item.data && item.data.includes("2025-05-13") || 
            item.horario && item.horario.includes("2025-05-13"));

        if (specificRecord) {
            console.log("✓ ENCONTRADO o registro de 13/05/2025:", specificRecord);
        } else {
            console.log("✗ NÃO ENCONTRADO registro de 13/05/2025 - verifique se ele está realmente na resposta da API");
        }

        // Imprimir os dados recebidos para diagnóstico
        console.log("Dados de frequência brutos recebidos:", JSON.stringify(data, null, 2));
        
        // Verificação se há dados
        if (!Array.isArray(data) || data.length === 0) {
            console.warn("Sem dados de frequência para processar");
            setAttendanceData([]);
            setChartLabels([]);
            return;
        }
        
        // Usar a data do servidor já obtida anteriormente
        let today = currentServerTime;
        
        if (!today) {
            try {
                // Código existente para obter horário...
                today = new Date(); // Fallback
            } catch (error) {
                console.error('Falha ao obter horário:', error);
                today = new Date();
            }
        }
        
        // Gerar array com os últimos 7 dias
        const lastSevenDays = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            // Formatar apenas para display
            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            lastSevenDays.push({
                dateObj: new Date(date), // Guardar o objeto Date completo
                formatted: formattedDate  // String formatada para display
            });
        }
        
        console.log("Últimos 7 dias para processamento:", lastSevenDays.map(d => ({
            formatted: d.formatted,
            fullDate: d.dateObj.toISOString()
        })));
        
        // Processar os dados para cada dia com uma lógica mais robusta
        const processedData = lastSevenDays.map(dateInfo => {
            // Para cada dia, vamos verificar se há registro correspondente
            const dateToCheck = dateInfo.dateObj;
            
            // Extrair apenas a data (sem considerar a hora)
            const yearToCheck = dateToCheck.getFullYear();
            const monthToCheck = dateToCheck.getMonth(); // 0-11
            const dayToCheck = dateToCheck.getDate();
            
            // Modifique a lógica de busca do registro para ser mais flexível:
            const record = data.find(item => {
                if (!item) return false;
                
                try {
                    // Tentar todas as propriedades de data disponíveis
                    let matches = false;
                    
                    // Verificar usando o campo data
                    if (item.data) {
                        const itemDate = new Date(item.data);
                        
                        // 1. Comparação direta de ano, mês, dia
                        const directMatch = 
                            itemDate.getUTCFullYear() === yearToCheck &&
                            itemDate.getUTCMonth() === monthToCheck && 
                            itemDate.getUTCDate() === dayToCheck;
                            
                        // 2. Comparação de string da data (ignore a hora)
                        const itemDateStr = itemDate.toISOString().split('T')[0];
                        const checkDateObj = new Date(yearToCheck, monthToCheck, dayToCheck);
                        const checkDateStr = checkDateObj.toISOString().split('T')[0];
                        
                        const strMatch = itemDateStr === checkDateStr;
                        
                        if (directMatch || strMatch) {
                            console.log(`CORRESPONDÊNCIA ENCONTRADA para ${dateInfo.formatted} via campo data`);
                            matches = true;
                        }
                    }
                    
                    // Verificar usando o campo horario se ainda não encontrou
                    if (!matches && item.horario) {
                        const itemTime = new Date(item.horario);
                        
                        const timeMatch = 
                            itemTime.getUTCFullYear() === yearToCheck &&
                            itemTime.getUTCMonth() === monthToCheck && 
                            itemTime.getUTCDate() === dayToCheck;
                            
                        if (timeMatch) {
                            console.log(`CORRESPONDÊNCIA ENCONTRADA para ${dateInfo.formatted} via campo horario`);
                            matches = true;
                        }
                    }
                    
                    return matches;
                } catch (error) {
                    console.error("Erro ao processar data:", error, item);
                    return false;
                }
            });
            
            // Extrair a hora do registro encontrado
            let hourValue = 0;
            
            if (record) {
                console.log(`Registro encontrado para ${dateInfo.formatted}:`, record);
                
                try {
                    if (record.horario) {
                        const recordTime = new Date(record.horario);
                        hourValue = recordTime.getHours();
                        console.log(`Hora extraída do registro: ${hourValue} (${record.horario})`);
                    } else {
                        console.log(`Registro sem campo horario, usando valor padrão`);
                        hourValue = 12; // Valor padrão se não houver horário específico
                    }
                } catch (error) {
                    console.error("Erro ao processar horário:", error, record);
                    hourValue = 12; // Valor padrão em caso de erro
                }
            } else {
                console.log(`Nenhum registro encontrado para ${dateInfo.formatted}`);
            }
            
            return {
                x: dateInfo.formatted,
                y: hourValue
            };
        });
        
        console.log("Dados processados para gráfico:", processedData);
        
        setChartLabels(lastSevenDays.map(d => d.formatted));
        setAttendanceData(processedData);
    };
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };
    
    const hoursChartData = {
        labels: chartLabels,
        datasets: [{
            label: "Horas de Registro",
            data: attendanceData.map(item => item.y),
            backgroundColor: 'rgba(245, 166, 35, 0.7)',
            borderColor: '#ff7b00',
            borderWidth: 1,
        }]
    };
    
    const attendanceChartData = {
        labels: ['Presente', 'Ausente'],
        datasets: [{
            label: "Status na Semana",
            data: [
                attendanceData.filter(item => item.y > 0).length,
                attendanceData.filter(item => item.y === 0).length
            ],
            backgroundColor: [
                'rgba(76, 175, 80, 0.7)',
                'rgba(244, 67, 54, 0.7)'
            ],
            borderColor: [
                '#4caf50',
                '#f44336'
            ],
            borderWidth: 1,
        }]
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: 'Histórico de Registros',
                color: 'white',
                font: {
                    size: window.innerWidth < 480 ? 14 : 16
                },
                padding: {
                    top: 5,
                    bottom: 15
                }
            }
        },
        layout: {
            padding: {
                left: 5,
                right: 10,
                top: 0,
                bottom: 0
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'white',
                    padding: 5,
                    maxTicksLimit: 6
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                }
            },
            x: {
                ticks: {
                    color: 'white',
                    maxRotation: window.innerWidth < 480 ? 45 : 0,
                    autoSkip: true,
                    maxTicksLimit: window.innerWidth < 480 ? 4 : 7
                },
                grid: {
                    display: false
                }
            }
        }
    };
    
    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: 'white'
                }
            },
            title: {
                display: true,
                text: 'Presença Semanal',
                color: 'white',
                font: {
                    size: 16
                }
            }
        }
    };

    if (loading) return (
        <div className="home-loading">
            <div className="loading-spinner"></div>
            <p>Carregando dashboard...</p>
        </div>
    );

    return (
        <div className="home-container">
            <header className="home-header">
                <div className="logo-container">
                    <img src="/logo.png" alt="" className="logo" />
                    <h2>FacePonto</h2>
                </div>
                
                <nav className="main-nav">
                    <Link to="/registro" className="nav-link">
                        <FaRegClock /> Registrar Ponto
                    </Link>
                    <Link to="/perfil" className="nav-link">
                        <FaUserCircle /> Perfil
                    </Link>
                </nav>
                
                <div className="user-actions">
                    <button className="logout-button" onClick={handleLogout}>
                        <FaSignOutAlt /> Sair
                    </button>
                </div>
            </header>
            
            <main className="home-content">
                <div className="welcome-section">
                    <h1>Bem Vindo, <span className="user-name">{userDisplayName}!</span></h1>
                    <p className="date-info">
                        Hoje é {(() => {
                            // Usa o horário do servidor se disponível
                            const dataReferencia = currentServerTime || new Date();
                            const options = { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric'
                            };
                            return dataReferencia.toLocaleDateString('pt-BR', options);
                        })()}
                    </p>
                </div>
                
                {error && <div className="error-message">{error}</div>}

                {attendanceData.length > 0 && attendanceData.every(item => item.y === 0) && (
                    <div className="info-message">
                        <p>Você ainda não registrou presença esta semana. Utilize a função "Registrar Ponto" para começar.</p>
                    </div>
                )}

        
                
                <div className="dashboard-grid">
                    <div className="chart-container hours-chart">
                        <h3><FaChartBar /> Registros da Semana</h3>
                        <div className="chart-wrapper">
                            <Bar 
                                key={chartKey} 
                                data={hoursChartData} 
                                options={chartOptions} 
                            />
                        </div>
                    </div>
                    
                    <div className="chart-container summary-stats">
                        <h3>Resumo da Semana</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <p className="stat-title">Total de Presenças</p>
                                <p className="stat-value">{attendanceData.filter(item => item.y > 0).length}</p>
                            </div>
                            <div className="stat-card">
                                <p className="stat-title">Total de Ausências</p>
                                <p className="stat-value">{attendanceData.filter(item => item.y === 0).length}</p>
                            </div>
                            <div className="stat-card">
                                <p className="stat-title">Taxa de Presença</p>
                                <p className="stat-value">
                                    {Math.round((attendanceData.filter(item => item.y > 0).length / 7) * 100)}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="quick-actions">
                    <Link to="/registro" className="action-card">
                        <FaRegClock className="action-icon" />
                        <span>Registrar Ponto</span>
                    </Link>
                    <Link to="/controle" className="action-card">
                        <FaChartBar className="action-icon" />
                        <span>Ver Relatórios</span>
                    </Link>
                </div>
            </main>
        </div>
    );
}

export default Home;
