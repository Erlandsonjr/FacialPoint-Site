import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaRegClock, FaSignOutAlt, FaChartBar, FaCalendarAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  LinearScale, 
  BarElement, 
  CategoryScale, 
  Tooltip, 
  Legend, 
  Title, 
  ArcElement, 
  PointElement,
  LineElement
} from 'chart.js';
import './home.css';

// Registrar todos os elementos necessários do Chart.js
ChartJS.register(
  LinearScale, 
  BarElement, 
  CategoryScale, 
  Tooltip, 
  Legend, 
  Title, 
  ArcElement, 
  PointElement,
  LineElement
);

function Home() {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [attendanceData, setAttendanceData] = useState([]);
    const [chartKey, setChartKey] = useState(0);
    const [currentServerTime, setCurrentServerTime] = useState(null);
    const [horarioTrabalho, setHorarioTrabalho] = useState(null);
    const [currentDayStatus, setCurrentDayStatus] = useState({
        diaSemana: '',
        entrada: null,
        saida: null
    });
    const [registrosDia, setRegistrosDia] = useState({
        entrada: null,
        saida: null
    });
    
    const navigate = useNavigate();
    const userDataFetched = React.useRef(false);

    const userDisplayName = useMemo(() => {
        if (!userData) return 'Usuário';
        if (userData.nome) return userData.nome;
        
        const storedName = localStorage.getItem('userName');
        if (storedName) return storedName;
        
        return 'Usuário';
    }, [userData]);

    // Determinar status atual (presente/ausente/fora de horário)
    const currentStatus = useMemo(() => {
        if (!currentServerTime || !horarioTrabalho || !currentDayStatus.diaSemana) {
            return 'indeterminado';
        }

        const agora = currentServerTime;
        const horaAtual = agora.getHours() + (agora.getMinutes() / 60);
        
        // NOVA LÓGICA: Verificar se o dia atual tem horário de trabalho configurado
        const temHorarioHoje = currentDayStatus.entrada && currentDayStatus.saida && 
                              currentDayStatus.entrada !== "" && currentDayStatus.saida !== "";
        
        // Se não tem horário configurado para hoje, é dia de folga
        if (!temHorarioHoje) {
            return 'dia-folga';
        }
        
        // Converter horário de trabalho para números
        const [entradaHora, entradaMinuto] = currentDayStatus.entrada.split(':').map(Number);
        const [saidaHora, saidaMinuto] = currentDayStatus.saida.split(':').map(Number);
        
        const horaEntrada = entradaHora + (entradaMinuto / 60);
        const horaSaida = saidaHora + (saidaMinuto / 60);
        
        // Verificar se está dentro do horário de trabalho
        if (horaAtual >= horaEntrada && horaAtual <= horaSaida) {
            // Verificar se registrou entrada hoje
            if (registrosDia.entrada) {
                if (registrosDia.saida) {
                    return 'finalizado'; // Já registrou entrada e saída
                }
                return 'presente'; // Registrou entrada mas não saída
            }
            return 'ausente'; // Não registrou entrada mas está em horário
        } else if (horaAtual < horaEntrada) {
            return 'antes-expediente'; // Ainda não começou o expediente
        } else {
            return 'apos-expediente'; // Já passou do horário de expediente
        }
    }, [currentServerTime, horarioTrabalho, currentDayStatus, registrosDia]);

    useEffect(() => {
        const fetchUserData = async () => {
            if (userDataFetched.current) {
                console.log("Dados do usuário já foram carregados");
                return;
            }

            try {
                // Obter horário oficial do backend
                const timeResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/horario-brasilia');
                
                if (!timeResponse.ok) {
                    throw new Error(`Erro ao obter horário inicial: ${timeResponse.status}`);
                }
                
                const timeData = await timeResponse.json();
                let serverTime = null;
                
                // Extrair o horário dos dados recebidos
                if (timeData && timeData.components) {
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
                    serverTime = new Date();
                }

                setCurrentServerTime(serverTime);
                
                // Obter dados do usuário
                const token = localStorage.getItem('token');
                
                if (!token) {
                    navigate('/');
                    return;
                }
                
                // Tentar obter informações do usuário
                try {
                    const userResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/usuarios/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        console.log("Dados de usuário obtidos:", userData);
                        setUserData(userData);
                        
                        // Configurar horário de trabalho do usuário
                        if (userData.horarioTrabalho) {
                            setHorarioTrabalho(userData.horarioTrabalho);
                            
                            // Determinar dia da semana atual
                            const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
                            const diaSemanaAtual = diasSemana[serverTime.getDay()];
                            
                            // Verificar se há horário configurado para o dia atual
                            const horarioDia = userData.horarioTrabalho[diaSemanaAtual];
                            
                            // Configurar horário do dia atual com verificação mais rigorosa
                            setCurrentDayStatus({
                                diaSemana: diaSemanaAtual,
                                entrada: (horarioDia && horarioDia.entrada && horarioDia.entrada.trim() !== "") ? horarioDia.entrada : null,
                                saida: (horarioDia && horarioDia.saida && horarioDia.saida.trim() !== "") ? horarioDia.saida : null
                            });
                            
                            console.log(`Horário para ${diaSemanaAtual}:`, horarioDia);
                        }
                    } else {
                        console.warn("Erro ao obter dados do usuário.");
                        const tokenParts = token.split('.');
                        const payload = JSON.parse(atob(tokenParts[1]));
                        const defaultUser = {
                            email: payload.email,
                            _id: payload._id,
                            nome: localStorage.getItem('userName') || 'Usuário'  
                        };
                        setUserData(defaultUser);
                    }
                    
                    userDataFetched.current = true;
                } catch (error) {
                    console.error("Erro ao buscar dados de usuário:", error);
                    const tokenParts = token.split('.');
                    const payload = JSON.parse(atob(tokenParts[1]));
                    const defaultUser = {
                        email: payload.email,
                        _id: payload._id,
                        nome: localStorage.getItem('userName') || 'Usuário' 
                    };
                    setUserData(defaultUser);
                    userDataFetched.current = true;
                }
                
                // Buscar registros de frequência
                const timestamp = Date.now();
                const attendanceResponse = await fetch(`https://faceponto-banco-dados-production.up.railway.app/frequencias/minhas?nocache=${timestamp}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache'
                    }
                });
                
                if (!attendanceResponse.ok) {
                    if (attendanceResponse.status === 404) {
                        console.log("Usuário sem registros de frequência");
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
                        
                        if (errorData.erro && (errorData.erro.includes("não encontrado") || 
                            errorData.erro.includes("frequência"))) {
                            console.log("Usuário sem registros ainda");
                            processAttendanceData([]);
                            return;
                        }
                        
                        throw new Error(`Erro ao carregar frequências: ${errorData.erro}`);
                    } catch (jsonError) {
                        processAttendanceData([]);
                        setError("Não foi possível carregar seu histórico de frequências.");
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
    
    // Atualizar o tamanho do gráfico quando a janela for redimensionada
    useEffect(() => {
        const handleResize = () => {
            setChartKey(prev => prev + 1);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    
    // Sincronização do relógio com o servidor
    useEffect(() => {
        let localTimer;
        let syncTimer;
        let localTime = null;
        
        // Função para sincronizar com o servidor
        const syncWithServer = async () => {
            try {
                const timeResponse = await fetch(`https://faceponto-banco-dados-production.up.railway.app/horario-brasilia?t=${Date.now()}`);
                
                if (!timeResponse.ok) {
                    throw new Error(`Erro ao atualizar horário: ${timeResponse.status}`);
                }
                
                const timeData = await timeResponse.json();
                let serverTime = null;
                
                if (timeData && timeData.components) {
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
                    throw new Error('Formato de resposta do servidor não reconhecido');
                }
                
                localTime = serverTime;
                setCurrentServerTime(serverTime);
            } catch (err) {
                console.error('Erro ao atualizar horário do servidor:', err);
            }
        };
        
        // Função para incrementar o horário localmente
        const updateLocalTime = () => {
            if (localTime) {
                localTime = new Date(localTime.getTime() + 1000);
                setCurrentServerTime(new Date(localTime));
            }
        };

        syncWithServer();
        
        localTimer = setInterval(updateLocalTime, 1000);
        syncTimer = setInterval(syncWithServer, 30000);
        
        return () => {
            clearInterval(localTimer);
            clearInterval(syncTimer);
        };
    }, []);
    
    // Processar dados de frequência
    const processAttendanceData = (data) => {
        console.log("Processando dados de frequência:", data);
        
        if (!Array.isArray(data) || data.length === 0) {
            console.warn("Sem dados de frequência para processar");
            setAttendanceData([]);
            return;
        }
        
        // Usar a data do servidor já obtida
        let today = currentServerTime || new Date();
        
        // Calcular o início da semana atual (domingo)
        const currentWeekDays = [];
        const todayDayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, etc.
        
        // Calcular quantos dias voltar para chegar ao domingo
        const daysToSunday = todayDayOfWeek;
        
        // Criar array com os 7 dias da semana atual (domingo a sábado)
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - daysToSunday + i);
            
            // Formatação para display
            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            
            // Nome do dia da semana
            const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            const dayName = dayNames[date.getDay()];
            
            // Mapear para nomes do schema do banco
            const diasSemanaSchema = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
            const diaSemanaSchema = diasSemanaSchema[date.getDay()];
            
            currentWeekDays.push({
                dateObj: new Date(date),
                formatted: formattedDate,
                dayName: dayName,
                fullDate: formatDateISO(date), // YYYY-MM-DD
                diaSemanaSchema: diaSemanaSchema // Para consultar horarioTrabalho
            });
        }
        
        console.log("Dias da semana atual:", currentWeekDays);
        
        // Função auxiliar para garantir formato YYYY-MM-DD
        function formatDateISO(date) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Estrutura para armazenar registros por dia
        const registrosPorDia = {};
        
        // Processar todos os registros para agrupar por dia
        data.forEach(registro => {
            // Converter a data UTC para horário de Brasília
            const dataRegistro = new Date(registro.data);
            
            // Usar toLocaleString para obter a data local de Brasília
            const dataLocalBrasilia = new Date(dataRegistro.toLocaleString('en-US', { 
                timeZone: 'America/Sao_Paulo' 
            }));
            
            // Formato YYYY-MM-DD para indexação usando a data local
            const dataFormatada = formatDateISO(dataLocalBrasilia);
            
            console.log(`Registro: ${registro.tipo_registro} - UTC: ${dataRegistro.toISOString()} - Local Brasília: ${dataLocalBrasilia.toISOString()} - Formatada: ${dataFormatada}`);
            
            if (!registrosPorDia[dataFormatada]) {
                registrosPorDia[dataFormatada] = {
                    entradas: [],
                    saidas: []
                };
            }
            
            // Usar a data local de Brasília para cálculos de horário
            if (registro.tipo_registro === 'entrada') {
                registrosPorDia[dataFormatada].entradas.push(dataLocalBrasilia);
            } else if (registro.tipo_registro === 'saida') {
                registrosPorDia[dataFormatada].saidas.push(dataLocalBrasilia);
            }
        });
        
        console.log("Registros agrupados por dia:", registrosPorDia);
        
        // Verificar registros para o dia atual
        const hoje = formatDateISO(today);
        
        if (registrosPorDia[hoje]) {
            const registrosHoje = registrosPorDia[hoje];
            setRegistrosDia({
                entrada: registrosHoje.entradas.length > 0 ? registrosHoje.entradas[0] : null,
                saida: registrosHoje.saidas.length > 0 ? registrosHoje.saidas[registrosHoje.saidas.length - 1] : null
            });
        } else {
            setRegistrosDia({
                entrada: null,
                saida: null
            });
        }
        
        // Processar dados para os gráficos da semana atual
        const processedData = currentWeekDays.map(dateInfo => {
            const dateFmt = dateInfo.fullDate; // Usar formato YYYY-MM-DD
            const dayRecords = registrosPorDia[dateFmt] || { entradas: [], saidas: [] };
            
            // Verificar se o usuário trabalha neste dia
            const horarioDia = horarioTrabalho && horarioTrabalho[dateInfo.diaSemanaSchema];
            const temHorarioHoje = horarioDia && horarioDia.entrada && horarioDia.saida && 
                                  horarioDia.entrada.trim() !== "" && horarioDia.saida.trim() !== "";
            
            // Obter o primeiro horário de entrada e último de saída
            const entradaHora = dayRecords.entradas.length > 0 
                ? dayRecords.entradas[0].getHours() + (dayRecords.entradas[0].getMinutes() / 60)
                : null;
                
            const saidaHora = dayRecords.saidas.length > 0 
                ? dayRecords.saidas[dayRecords.saidas.length - 1].getHours() + (dayRecords.saidas[dayRecords.saidas.length - 1].getMinutes() / 60)
                : null;
            
            console.log(`${dateInfo.dayName} ${dateInfo.formatted}: entrada=${entradaHora}, saida=${saidaHora}, trabalha=${temHorarioHoje}`);
            
            return {
                date: `${dateInfo.dayName}\n${dateInfo.formatted}`, // Mostrar dia da semana + data
                entrada: entradaHora,
                saida: saidaHora,
                isWorkDay: temHorarioHoje // NOVO: indica se é dia de trabalho
            };
        });
        
        console.log("Dados processados para gráfico da semana atual:", processedData);
        setAttendanceData(processedData);
    };
    
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };
    
    // Dados para o gráfico de linha (entrada/saída)
    const lineChartData = {
        labels: attendanceData.map(item => item.date),
        datasets: [
            {
                label: "Entrada",
                data: attendanceData.map(item => item.entrada),
                backgroundColor: 'rgba(46, 204, 113, 0.2)',
                borderColor: '#2ecc71',
                borderWidth: 2,
                pointBackgroundColor: '#2ecc71',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.2
            },
            {
                label: "Saída",
                data: attendanceData.map(item => item.saida),
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: '#3498db',
                borderWidth: 2,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.2
            }
        ]
    };
    
    // Dados para o gráfico de rosca (presença) - apenas dias de trabalho
    const pieChartData = useMemo(() => {
        const diasTrabalho = attendanceData.filter(item => item.isWorkDay);
        const diasPresentes = diasTrabalho.filter(item => item.entrada !== null);
        const diasAusentes = diasTrabalho.filter(item => item.entrada === null);
        
        return {
            labels: ['Presente', 'Ausente'],
            datasets: [{
                data: [
                    diasPresentes.length,
                    diasAusentes.length
                ],
                backgroundColor: [
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(231, 76, 60, 0.7)'
                ],
                borderColor: [
                    '#2ecc71',
                    '#e74c3c'
                ],
                borderWidth: 1,
            }]
        };
    }, [attendanceData]);
    
    // Opções para o gráfico de linha
    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.95)',
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 26, 0.9)',
                titleColor: 'rgba(255, 255, 255, 0.95)',
                bodyColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 6,
                displayColors: true,
                boxPadding: 6,
                usePointStyle: true,
                callbacks: {
                    title: function(tooltipItems) {
                        return `${tooltipItems[0].label}`;
                    },
                    label: function(context) {
                        const value = context.raw;
                        if (value === null) return 'Não registrado';
                        
                        const hour = Math.floor(value);
                        const minute = Math.floor((value - hour) * 60);
                        
                        // Se for exatamente 24h, mostrar como 24:00
                        if (hour === 24) {
                            return `${context.dataset.label}: 24:00`;
                        }
                        
                        return `${context.dataset.label}: ${hour}:${minute.toString().padStart(2, '0')}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                min: 0,   // MUDANÇA: Começando em 00:00 (meia-noite)
                max: 24,  // Até 24h (meia-noite seguinte)
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: 8,
                    maxTicksLimit: 13, // Aumentado para mostrar mais horários (0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24)
                    stepSize: 2, // Incremento de 2 em 2 horas
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    },
                    callback: (value) => {
                        const hour = Math.floor(value);
                        
                        // Mostrar 24:00 para o valor 24
                        if (hour === 24) {
                            return '24:00';
                        }
                        
                        return `${hour.toString().padStart(2, '0')}:00`;
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                }
            },
            x: {
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    maxRotation: window.innerWidth < 768 ? 45 : 0, // Rotacionar em telas menores
                    autoSkip: false, // Não pular labels para mostrar todos os dias
                    font: {
                        family: "'Inter', sans-serif",
                        size: window.innerWidth < 480 ? 9 : 11 // Fonte menor em mobile
                    }
                },
                grid: {
                    display: false,
                    color: 'rgba(255, 255, 255, 0.05)'
                }
            }
        }
    };
    
    // Opções para o gráfico de rosca
    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: 'rgba(255, 255, 255, 0.95)',
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 12
                    }
                }
            },
            title: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(26, 26, 26, 0.9)',
                titleColor: 'rgba(255, 255, 255, 0.95)',
                bodyColor: 'rgba(255, 255, 255, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 6
            }
        },
        cutout: '65%'
    };

    // Formato para exibição de horário
    const formatTime = (date) => {
        if (!date) return "Não registrado";
        if (typeof date === 'string') return date;
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit', 
            minute: '2-digit'
        });
    };

    // Formatação de dia da semana
    const formatWeekday = (dia) => {
        const dias = {
            'domingo': 'Domingo',
            'segunda': 'Segunda-feira',
            'terca': 'Terça-feira',
            'quarta': 'Quarta-feira',
            'quinta': 'Quinta-feira',
            'sexta': 'Sexta-feira',
            'sabado': 'Sábado'
        };
        return dias[dia] || dia;
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
                    <Link to="/perfil" className="nav-link">
                        <FaUserCircle /> Perfil
                    </Link>
                    <Link to="/controle" className="nav-link">
                        <FaChartBar /> Relatórios
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
                        {currentServerTime ? (
                            currentServerTime.toLocaleDateString('pt-BR', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })
                        ) : (
                            "Sincronizando horário..."
                        )}
                    </p>
                    <div className="current-time">
                        {currentServerTime ? (
                            currentServerTime.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            })
                        ) : (
                            "00:00:00"
                        )}
                    </div>
                </div>
                
                {error && <div className="error-message">{error}</div>}

                {/* Nova seção: Status atual */}
                <section className="status-card">
                    <div className={`status-indicator ${currentStatus}`}>
                        {currentStatus === 'presente' && (
                            <>
                                <FaCheckCircle className="status-icon" />
                                <div className="status-text">
                                    <h3>Você está presente</h3>
                                    <p>Entrada registrada às {formatTime(registrosDia.entrada)}</p>
                                </div>
                            </>
                        )}
                        {currentStatus === 'ausente' && (
                            <>
                                <FaTimesCircle className="status-icon" />
                                <div className="status-text">
                                    <h3>Você está ausente</h3>
                                    <p>Registre seu ponto de entrada</p>
                                </div>
                            </>
                        )}
                        {currentStatus === 'finalizado' && (
                            <>
                                <FaCheckCircle className="status-icon" />
                                <div className="status-text">
                                    <h3>Expediente finalizado</h3>
                                    <p>Saída registrada às {formatTime(registrosDia.saida)}</p>
                                </div>
                            </>
                        )}
                        {currentStatus === 'antes-expediente' && (
                            <>
                                <FaRegClock className="status-icon" />
                                <div className="status-text">
                                    <h3>Expediente não iniciado</h3>
                                    <p>Seu horário começa às {currentDayStatus.entrada}</p>
                                </div>
                            </>
                        )}
                        {currentStatus === 'apos-expediente' && (
                            <>
                                <FaRegClock className="status-icon" />
                                <div className="status-text">
                                    <h3>Expediente encerrado</h3>
                                    <p>Seu horário encerrou às {currentDayStatus.saida}</p>
                                </div>
                            </>
                        )}
                        {/* NOVO CASO: Dia de folga */}
                        {currentStatus === 'dia-folga' && (
                            <>
                                <FaCalendarAlt className="status-icon" />
                                <div className="status-text">
                                    <h3>Hoje é seu dia de folga</h3>
                                    <p>Aproveite seu descanso!</p>
                                </div>
                            </>
                        )}
                        {currentStatus === 'fora-expediente' && (
                            <>
                                <FaCalendarAlt className="status-icon" />
                                <div className="status-text">
                                    <h3>Dia sem expediente</h3>
                                    <p>Não há horário configurado para hoje</p>
                                </div>
                            </>
                        )}
                        {currentStatus === 'indeterminado' && (
                            <>
                                <FaRegClock className="status-icon" />
                                <div className="status-text">
                                    <h3>Status indeterminado</h3>
                                    <p>Verifique sua escala de trabalho</p>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="today-schedule">
                        <h4><FaCalendarAlt /> Horário de Hoje: {formatWeekday(currentDayStatus.diaSemana)}</h4>
                        <div className="schedule-times">
                            {currentStatus === 'dia-folga' ? (
                                <div className="folga-message">
                                    <p>🌴 Dia de folga - Sem expediente</p>
                                </div>
                            ) : (
                                <>
                                    <div className="schedule-time">
                                        <span>Entrada:</span> 
                                        <strong>{currentDayStatus.entrada || "Não definido"}</strong>
                                    </div>
                                    <div className="schedule-time">
                                        <span>Saída:</span> 
                                        <strong>{currentDayStatus.saida || "Não definido"}</strong>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </section>
                
                {/* Gráficos atualizados */}
                <div className="dashboard-grid">
                    <div className="chart-container attendance-line-chart">
                        <h3><FaChartBar /> Horários da Semana Atual</h3>
                        <div className="chart-wrapper">
                            <Line 
                                key={`line-${chartKey}`}
                                data={lineChartData} 
                                options={lineOptions} 
                            />
                        </div>
                    </div>
                    
                    <div className="chart-container summary-stats">
                        <h3>Resumo da Semana Atual</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <p className="stat-title">Dias de Trabalho</p>
                                <p className="stat-value">
                                    {attendanceData.filter(item => item.isWorkDay).length}
                                </p>
                            </div>
                            <div className="stat-card">
                                <p className="stat-title">Dias Presentes</p>
                                <p className="stat-value">
                                    {attendanceData.filter(item => item.isWorkDay && item.entrada !== null).length}
                                </p>
                            </div>
                            <div className="stat-card">
                                <p className="stat-title">Dias Ausentes</p>
                                <p className="stat-value">
                                    {attendanceData.filter(item => item.isWorkDay && item.entrada === null).length}
                                </p>
                            </div>
                            <div className="stat-card">
                                <p className="stat-title">Taxa de Presença</p>
                                <p className="stat-value">
                                    {(() => {
                                        const diasTrabalho = attendanceData.filter(item => item.isWorkDay);
                                        const diasPresentes = diasTrabalho.filter(item => item.entrada !== null);
                                        return diasTrabalho.length > 0 ? Math.round((diasPresentes.length / diasTrabalho.length) * 100) : 0;
                                    })()}%
                                </p>
                            </div>
                        </div>
                        
                        <div className="doughnut-chart-container">
                            <Doughnut 
                                key={`doughnut-${chartKey}`}
                                data={pieChartData}
                                options={pieOptions}
                            />
                        </div>
                    </div>
                </div>
                
                {/* Botões de ação rápida */}
                <div className="quick-actions">
                    <Link to="/controle" className="action-card">
                        <FaChartBar className="action-icon" />
                        <span>Relatórios Detalhados</span>
                    </Link>
                    <Link to="/perfil" className="action-card">
                        <FaUserCircle className="action-icon" />
                        <span>Gerenciar Perfil</span>
                    </Link>
                </div>
            </main>
        </div>
    );
}

export default Home;