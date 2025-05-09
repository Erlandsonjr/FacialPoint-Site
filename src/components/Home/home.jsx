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
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = localStorage.getItem('token');
                
                if (!token) {
                    navigate('/');
                    return;
                }
                
                const tokenParts = token.split('.');
                const payload = JSON.parse(atob(tokenParts[1]));
                console.log("Token payload:", payload);
                
                try {
                    const userDetailResponse = await fetch(`https://faceponto-banco-dados-production.up.railway.app/usuarios/${payload.id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (userDetailResponse.ok) {
                        const userDetailData = await userDetailResponse.json();
                        console.log("Dados obtidos por ID:", userDetailData);
                        setUserData(userDetailData);
                    } else {
                        const userResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/usuarios/me', {
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (userResponse.ok) {
                            const userData = await userResponse.json();
                            console.log("Dados obtidos por /me:", userData);
                            
                            if (userData && userData.nome) {
                                setUserData(userData);
                            } else {
                                const defaultUser = {
                                    email: payload.email,
                                    _id: payload.id,
                                    nome: localStorage.getItem('userName') || 'Usuário'  // Remover email como fallback
                                };
                                setUserData(defaultUser);
                            }
                        } else {
                            const defaultUser = {
                                email: payload.email,
                                _id: payload.id,
                                nome: localStorage.getItem('userName') || 'Usuário'  // Remover email como fallback
                            };
                            setUserData(defaultUser);
                        }
                    }
                } catch (error) {
                    console.error("Erro ao buscar dados de usuário:", error);
                    const defaultUser = {
                        email: payload.email,
                        _id: payload.id,
                        nome: localStorage.getItem('userName') || 'Usuário'  // Remover email como fallback
                    };
                    setUserData(defaultUser);
                }
                
                const attendanceResponse = await fetch('https://faceponto-banco-dados-production.up.railway.app/frequencias/minhas', {
                    headers: {
                        'Authorization': `Bearer ${token}`
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
    
    const processAttendanceData = (data) => {
        if (!Array.isArray(data)) {
            console.error("Dados de frequência inválidos:", data);
            setError("Formato de dados de frequência inválido");
            return;
        }
        
        if (data.length === 0) {
            console.log("Usuário não possui registros de frequência");
            setError("Você ainda não possui registros de frequência");
        }
        
        const today = new Date();
        const lastSevenDays = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(today.getDate() - i);
            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            lastSevenDays.push(formattedDate);
        }
        
        const processedData = lastSevenDays.map(date => {
            const record = data.find(item => {
                if (!item || !item.data) {
                    return false;
                }
                
                try {
                    const itemDate = new Date(item.data);
                    const formattedItemDate = `${itemDate.getDate().toString().padStart(2, '0')}/${(itemDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    return formattedItemDate === date;
                } catch (error) {
                    console.error("Erro ao processar data:", error, item);
                    return false;
                }
            });
            
            let hourValue = 0;
            
            if (record && record.horario) {
                try {
                    const recordTime = new Date(record.horario);
                    hourValue = recordTime.getHours();
                } catch (error) {
                    console.error("Erro ao processar horário:", error, record);
                }
            }
            
            return {
                x: date,
                y: hourValue
            };
        });
        
        setChartLabels(lastSevenDays);
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

    const getUserDisplayName = () => {
        console.log("userData no getUserDisplayName:", userData);
        
        if (!userData) return 'Usuário';
        
        if (userData.nome) return userData.nome;
        if (userData.Nome) return userData.Nome;
        if (userData.name) return userData.name;
        
        const storedName = localStorage.getItem('userName');
        if (storedName) return storedName;
        
        return 'Usuário';
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
                    <h1>Bem Vindo, <span className="user-name">{getUserDisplayName()}!</span></h1>
                    <p className="date-info">Hoje é {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
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