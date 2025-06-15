import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaRegClock,
  FaSignOutAlt,
  FaChartBar,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import { Bar, Line, Doughnut } from "react-chartjs-2";
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
  LineElement,
} from "chart.js";
import "./home.css";

const API_BASE = "https://faceponto-banco-dados-production.up.railway.app";

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
  const [error, setError] = useState("");
  const [attendanceData, setAttendanceData] = useState([]);
  const [chartKey, setChartKey] = useState(0);
  const [currentServerTime, setCurrentServerTime] = useState(null);
  const [horarioTrabalho, setHorarioTrabalho] = useState(null);
  const [registrosDia, setRegistrosDia] = useState({
    entrada: null,
    saida: null,
  });
  const [attendanceRaw, setAttendanceRaw] = useState(null);
  const [usingLocalTime, setUsingLocalTime] = useState(false);

  const navigate = useNavigate();
  const userDataFetched = React.useRef(false);

  const userDisplayName = useMemo(() => {
    if (!userData) return "Usuário";
    if (userData.nome) return userData.nome;

    const storedName = localStorage.getItem("userName");
    if (storedName) return storedName;

    return "Usuário";
  }, [userData]);

  const currentStatus = useMemo(() => {
    if (!currentServerTime || !horarioTrabalho) {
      return "indeterminado";
    }

    const agora = currentServerTime;
    const horaAtual = agora.getHours() + agora.getMinutes() / 60;

    const diasSemana = [
      "domingo",
      "segunda",
      "terca",
      "quarta",
      "quinta",
      "sexta",
      "sabado",
    ];
    const diaSemanaAtual = diasSemana[agora.getDay()];
    const horarioDia = horarioTrabalho[diaSemanaAtual];

    const temHorarioHoje =
      horarioDia &&
      horarioDia.entrada &&
      horarioDia.saida &&
      horarioDia.entrada.trim() !== "" &&
      horarioDia.saida.trim() !== "";

    if (!temHorarioHoje) {
      return "dia-folga";
    }

    const [entradaHora, entradaMinuto] = horarioDia.entrada
      .split(":")
      .map(Number);
    const [saidaHora, saidaMinuto] = horarioDia.saida.split(":").map(Number);

    const horaEntrada = entradaHora + entradaMinuto / 60;
    const horaSaida = saidaHora + saidaMinuto / 60;

    if (horaAtual >= horaEntrada && horaAtual <= horaSaida) {
      if (registrosDia.entrada) {
        if (registrosDia.saida) {
          return "finalizado";
        }
        return "presente";
      }
      return "ausente";
    } else if (horaAtual < horaEntrada) {
      return "antes-expediente";
    } else {
      return "apos-expediente";
    }
  }, [currentServerTime, horarioTrabalho, registrosDia]);

  const currentDayStatus = useMemo(() => {
    if (!currentServerTime || !horarioTrabalho)
      return { diaSemana: "", entrada: null, saida: null };
    const diasSemana = [
      "domingo",
      "segunda",
      "terca",
      "quarta",
      "quinta",
      "sexta",
      "sabado",
    ];
    const diaSemanaAtual = diasSemana[currentServerTime.getDay()];
    const horarioDia = horarioTrabalho[diaSemanaAtual];
    return {
      diaSemana: diaSemanaAtual,
      entrada:
        horarioDia && horarioDia.entrada && horarioDia.entrada.trim() !== ""
          ? horarioDia.entrada
          : null,
      saida:
        horarioDia && horarioDia.saida && horarioDia.saida.trim() !== ""
          ? horarioDia.saida
          : null,
    };
  }, [currentServerTime, horarioTrabalho]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (userDataFetched.current) {
        return;
      }
      try {
        const timeResponse = await fetch(
          `${API_BASE}/proxy/horario-brasilia`
        );
        if (!timeResponse.ok)
          throw new Error(`Erro ao atualizar horário: ${timeResponse.status}`);
        const timeData = await timeResponse.json();
        const serverTime = new Date(timeData.dateTime || timeData.datetime);

        setCurrentServerTime(serverTime);
        setUsingLocalTime(false);

        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/");
          return;
        }

        try {
          const userResponse = await fetch(
            `${API_BASE}/usuarios/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserData(userData);

            if (userData.horarioTrabalho) {
              setHorarioTrabalho(userData.horarioTrabalho);

              const diasSemana = [
                "domingo",
                "segunda",
                "terca",
                "quarta",
                "quinta",
                "sexta",
                "sabado",
              ];
              const diaSemanaAtual = diasSemana[serverTime.getDay()];

              const horarioDia = userData.horarioTrabalho[diaSemanaAtual];
            }
          } else {
            const tokenParts = token.split(".");
            const payload = JSON.parse(atob(tokenParts[1]));
            const defaultUser = {
              email: payload.email,
              _id: payload._id,
              nome: localStorage.getItem("userName") || "Usuário",
            };
            setUserData(defaultUser);
          }

          userDataFetched.current = true;
        } catch (error) {
          const tokenParts = token.split(".");
          const payload = JSON.parse(atob(tokenParts[1]));
          const defaultUser = {
            email: payload.email,
            _id: payload._id,
            nome: localStorage.getItem("userName") || "Usuário",
          };
          setUserData(defaultUser);
          userDataFetched.current = true;
        }

        const timestamp = Date.now();
        const attendanceResponse = await fetch(
          `${API_BASE}/frequencias/minhas?nocache=${timestamp}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
            },
          }
        );

        if (!attendanceResponse.ok) {
          if (attendanceResponse.status === 404) {
            return;
          }

          if (
            attendanceResponse.status === 401 ||
            attendanceResponse.status === 403
          ) {
            localStorage.removeItem("token");
            navigate("/");
            return;
          }

          try {
            const errorData = await attendanceResponse.json();

            if (
              errorData.erro &&
              (errorData.erro.includes("não encontrado") ||
                errorData.erro.includes("frequência"))
            ) {
              return;
            }

            throw new Error(`Erro ao carregar frequências: ${errorData.erro}`);
          } catch (jsonError) {
            setError("Não foi possível carregar seu histórico de frequências.");
          }
          return;
        }

        const attendanceData = await attendanceResponse.json();

        setAttendanceRaw(attendanceData);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  useEffect(() => {
    const handleResize = () => {
      setChartKey((prev) => prev + 1);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    let localTimer;
    let syncTimer;
    let failedAttempts = 0;
    const maxFailedAttempts = 3;

    let localTime = currentServerTime || new Date();

    const syncWithServer = async () => {
      try {
        const timeResponse = await fetch(
          `${API_BASE}/proxy/horario-brasilia`
        );

        if (!timeResponse.ok)
          throw new Error(`Erro ao atualizar horário: ${timeResponse.status}`);

        const timeData = await timeResponse.json();
        const serverTime = new Date(timeData.dateTime || timeData.datetime);

        failedAttempts = 0;
        localTime = serverTime;
        setCurrentServerTime(serverTime);
        setUsingLocalTime(false);
      } catch (err) {
        failedAttempts++;
        setUsingLocalTime(true);

        if (!localTime) {
          localTime = new Date();
          setCurrentServerTime(new Date());
        }
      }
    };

    const updateLocalTime = () => {
      if (localTime) {
        localTime = new Date(localTime.getTime() + 1000);
        setCurrentServerTime(new Date(localTime));
      }
    };

    syncWithServer();

    localTimer = setInterval(updateLocalTime, 1000);

    syncTimer = setInterval(
      syncWithServer,
      failedAttempts >= maxFailedAttempts ? 60000 : 30000
    );

    return () => {
      clearInterval(localTimer);
      clearInterval(syncTimer);
    };
  }, []);

  const processAttendanceData = (data) => {
    let today = currentServerTime || new Date();

    const currentWeekDays = [];
    const todayDayOfWeek = today.getDay();
    const daysToSunday = todayDayOfWeek;

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - daysToSunday + i);

      const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}`;
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dayName = dayNames[date.getDay()];
      const diasSemanaSchema = [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
      ];
      const diaSemanaSchema = diasSemanaSchema[date.getDay()];

      currentWeekDays.push({
        dateObj: new Date(date),
        formatted: formattedDate,
        dayName: dayName,
        fullDate: formatDateISO(date),
        diaSemanaSchema: diaSemanaSchema,
      });
    }

    function formatDateISO(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    const registrosPorDia = {};

    if (Array.isArray(data)) {
      data.forEach((registro) => {
        const dataRegistro = new Date(registro.data);
        const dataLocalBrasilia = new Date(
          dataRegistro.toLocaleString("en-US", {
            timeZone: "America/Sao_Paulo",
          })
        );
        const dataFormatada = formatDateISO(dataLocalBrasilia);

        if (!registrosPorDia[dataFormatada]) {
          registrosPorDia[dataFormatada] = {
            entradas: [],
            saidas: [],
          };
        }

        if (registro.tipo_registro === "entrada") {
          registrosPorDia[dataFormatada].entradas.push(dataLocalBrasilia);
        } else if (registro.tipo_registro === "saida") {
          registrosPorDia[dataFormatada].saidas.push(dataLocalBrasilia);
        }
      });
    }

    const hoje = formatDateISO(today);
    if (registrosPorDia[hoje]) {
      const registrosHoje = registrosPorDia[hoje];
      setRegistrosDia({
        entrada:
          registrosHoje.entradas.length > 0 ? registrosHoje.entradas[0] : null,
        saida:
          registrosHoje.saidas.length > 0
            ? registrosHoje.saidas[registrosHoje.saidas.length - 1]
            : null,
      });
    } else {
      setRegistrosDia({
        entrada: null,
        saida: null,
      });
    }

    const processedData = currentWeekDays.map((dateInfo) => {
      const dateFmt = dateInfo.fullDate;
      const dayRecords = registrosPorDia[dateFmt] || {
        entradas: [],
        saidas: [],
      };

      const horarioDia =
        horarioTrabalho && horarioTrabalho[dateInfo.diaSemanaSchema];
      const temHorarioHoje =
        horarioDia &&
        horarioDia.entrada &&
        horarioDia.saida &&
        horarioDia.entrada.trim() !== "" &&
        horarioDia.saida.trim() !== "";

      const entradaHora =
        dayRecords.entradas.length > 0
          ? dayRecords.entradas[0].getHours() +
            dayRecords.entradas[0].getMinutes() / 60
          : null;

      const saidaHora =
        dayRecords.saidas.length > 0
          ? dayRecords.saidas[dayRecords.saidas.length - 1].getHours() +
            dayRecords.saidas[dayRecords.saidas.length - 1].getMinutes() / 60
          : null;

      return {
        date: `${dateInfo.dayName}\n${dateInfo.formatted}`,
        entrada: entradaHora,
        saida: saidaHora,
        isWorkDay: temHorarioHoje,
        dateObj: dateInfo.dateObj,
        diaSemanaSchema: dateInfo.diaSemanaSchema,
      };
    });

    setAttendanceData(processedData);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const lineChartData = {
    labels: attendanceData.map((item) => item.date),
    datasets: [
      {
        label: "Entrada",
        data: attendanceData.map((item) => item.entrada),
        backgroundColor: "rgba(46, 204, 113, 0.2)",
        borderColor: "#2ecc71",
        borderWidth: 2,
        pointBackgroundColor: "#2ecc71",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.2,
      },
      {
        label: "Saída",
        data: attendanceData.map((item) => item.saida),
        backgroundColor: "rgba(52, 152, 219, 0.2)",
        borderColor: "#3498db",
        borderWidth: 2,
        pointBackgroundColor: "#3498db",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.2,
      },
    ],
  };

  const pieChartData = useMemo(() => {
    const diasDecididos = attendanceData.filter(
      (item) =>
        item.isWorkDay &&
        isDayInPastOrToday(
          item.dateObj,
          horarioTrabalho?.[item.diaSemanaSchema]?.entrada,
          currentServerTime
        )
    );
    const diasPresentes = diasDecididos.filter((item) => item.entrada !== null);
    const diasAusentes = diasDecididos.filter((item) => item.entrada === null);

    return {
      labels: ["Presente", "Ausente"],
      datasets: [
        {
          data: [diasPresentes.length, diasAusentes.length],
          backgroundColor: [
            "rgba(46, 204, 113, 0.7)",
            "rgba(231, 76, 60, 0.7)",
          ],
          borderColor: ["#2ecc71", "#e74c3c"],
          borderWidth: 1,
        },
      ],
    };
  }, [attendanceData, horarioTrabalho, currentServerTime]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    devicePixelRatio: 2,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "rgba(255, 255, 255, 0.95)",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(26, 26, 26, 0.9)",
        titleColor: "rgba(255, 255, 255, 0.95)",
        bodyColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
        displayColors: true,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          title: function (tooltipItems) {
            return `${tooltipItems[0].label}`;
          },
          label: function (context) {
            const value = context.raw;
            if (value === null) return "Não registrado";

            const hour = Math.floor(value);
            const minute = Math.floor((value - hour) * 60);

            if (hour === 24) {
              return `${context.dataset.label}: 24:00`;
            }

            return `${context.dataset.label}: ${hour}:${minute
              .toString()
              .padStart(2, "0")}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        min: 0,
        max: 24,
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          padding: 8,
          maxTicksLimit: 13,
          stepSize: 2,
          font: {
            family: "'Inter', sans-serif",
            size: 11,
          },
          callback: (value) => {
            const hour = Math.floor(value);

            if (hour === 24) {
              return "24:00";
            }

            return `${hour.toString().padStart(2, "0")}:00`;
          },
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          drawBorder: false,
        },
      },
      x: {
        ticks: {
          color: "rgba(255, 255, 255, 0.7)",
          maxRotation: window.innerWidth < 768 ? 45 : 0,
          autoSkip: false,
          font: {
            family: "'Inter', sans-serif",
            size: window.innerWidth < 480 ? 9 : 11,
          },
        },
        grid: {
          display: false,
          color: "rgba(255, 255, 255, 0.05)",
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "rgba(255, 255, 255, 0.95)",
          usePointStyle: true,
          padding: 15,
          font: {
            family: "'Inter', sans-serif",
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(26, 26, 26, 0.9)",
        titleColor: "rgba(255, 255, 255, 0.95)",
        bodyColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 6,
      },
    },
    cutout: "65%",
  };

  const formatTime = (date) => {
    if (!date) return "Não registrado";
    if (typeof date === "string") return date;
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatWeekday = (dia) => {
    const dias = {
      domingo: "Domingo",
      segunda: "Segunda-feira",
      terca: "Terça-feira",
      quarta: "Quarta-feira",
      quinta: "Quinta-feira",
      sexta: "Sexta-feira",
      sabado: "Sábado",
    };
    return dias[dia] || dia;
  };

  function isDayInPastOrToday(
    dateObj,
    entradaHorarioTrabalho,
    currentServerTime
  ) {
    const today = new Date(currentServerTime);
    today.setHours(0, 0, 0, 0);

    const dia = new Date(dateObj);
    dia.setHours(0, 0, 0, 0);

    if (dia < today) return true;

    if (dia.getTime() === today.getTime()) {
      if (!entradaHorarioTrabalho) return false;
      const [entradaHora, entradaMinuto] = entradaHorarioTrabalho
        .split(":")
        .map(Number);
      const agora = currentServerTime;
      if (
        agora.getHours() > entradaHora ||
        (agora.getHours() === entradaHora &&
          agora.getMinutes() >= entradaMinuto)
      ) {
        return true;
      }
      return false;
    }
    return false;
  }

  useEffect(() => {
    if (horarioTrabalho && attendanceRaw) {
      processAttendanceData(attendanceRaw);
    }
  }, [horarioTrabalho, attendanceRaw]);

  if (loading)
    return (
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
            <FaChartBar /> Gerar Relatório
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
          <h1>
            Bem Vindo, <span className="user-name">{userDisplayName}!</span>
          </h1>
          <p className="date-info">
            {currentServerTime
              ? currentServerTime.toLocaleDateString("pt-BR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Sincronizando horário..."}
          </p>
          <div className="current-time">
            {currentServerTime
              ? currentServerTime.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              : "00:00:00"}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        <section className="status-card">
          <div className={`status-indicator ${currentStatus}`}>
            {currentStatus === "presente" && (
              <>
                <FaCheckCircle className="status-icon" />
                <div className="status-text">
                  <h3>Você está presente</h3>
                  <p>
                    Entrada registrada às {formatTime(registrosDia.entrada)}
                  </p>
                </div>
              </>
            )}
            {currentStatus === "ausente" && (
              <>
                <FaTimesCircle className="status-icon" />
                <div className="status-text">
                  <h3>Você está ausente</h3>
                  <p>Registre seu ponto de entrada</p>
                </div>
              </>
            )}
            {currentStatus === "finalizado" && (
              <>
                <FaCheckCircle className="status-icon" />
                <div className="status-text">
                  <h3>Expediente finalizado</h3>
                  <p>Saída registrada às {formatTime(registrosDia.saida)}</p>
                </div>
              </>
            )}
            {currentStatus === "antes-expediente" && (
              <>
                <FaRegClock className="status-icon" />
                <div className="status-text">
                  <h3>Expediente não iniciado</h3>
                  <p>Seu horário começa às {currentDayStatus.entrada}</p>
                </div>
              </>
            )}
            {currentStatus === "apos-expediente" && (
              <>
                <FaRegClock className="status-icon" />
                <div className="status-text">
                  <h3>Expediente encerrado</h3>
                  <p>Seu horário encerrou às {currentDayStatus.saida}</p>
                </div>
              </>
            )}
            {currentStatus === "dia-folga" && (
              <>
                <FaCalendarAlt className="status-icon" />
                <div className="status-text">
                  <h3>Hoje é seu dia de folga</h3>
                  <p>Aproveite seu descanso!</p>
                </div>
              </>
            )}
            {currentStatus === "fora-expediente" && (
              <>
                <FaCalendarAlt className="status-icon" />
                <div className="status-text">
                  <h3>Dia sem expediente</h3>
                  <p>Não há horário configurado para hoje</p>
                </div>
              </>
            )}
            {currentStatus === "indeterminado" && (
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
            <h4>
              <FaCalendarAlt /> Horário de Hoje:{" "}
              {formatWeekday(currentDayStatus.diaSemana)}
            </h4>
            <div className="schedule-times">
              {currentStatus === "dia-folga" ? (
                <div className="folga-message">
                  <p>🌴 Dia de folga - Sem expediente</p>
                </div>
              ) : (
                <>
                  <div className="schedule-time">
                    <span>Entrada:</span>
                    <strong>
                      {currentDayStatus.entrada || "Não definido"}
                    </strong>
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

        <div className="dashboard-grid">
          <div className="chart-container attendance-line-chart">
            <h3>
              <FaChartBar /> Horários da Semana Atual
            </h3>
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
                  {attendanceData.filter((item) => item.isWorkDay).length}
                </p>
              </div>
              <div className="stat-card">
                <p className="stat-title">Dias Presentes</p>
                <p className="stat-value">
                  {
                    attendanceData.filter(
                      (item) =>
                        item.isWorkDay &&
                        item.entrada !== null &&
                        isDayInPastOrToday(
                          item.dateObj,
                          horarioTrabalho?.[item.diaSemanaSchema]?.entrada,
                          currentServerTime
                        )
                    ).length
                  }
                </p>
              </div>
              <div className="stat-card">
                <p className="stat-title">Dias Ausentes</p>
                <p className="stat-value">
                  {
                    attendanceData.filter(
                      (item) =>
                        item.isWorkDay &&
                        item.entrada === null &&
                        isDayInPastOrToday(
                          item.dateObj,
                          horarioTrabalho?.[item.diaSemanaSchema]?.entrada,
                          currentServerTime
                        )
                    ).length
                  }
                </p>
              </div>
              <div className="stat-card">
                <p className="stat-title">Taxa de Presença Até o Momento</p>
                <p className="stat-value">
                  {(() => {
                    const diasTrabalho = attendanceData.filter(
                      (item) =>
                        item.isWorkDay &&
                        isDayInPastOrToday(
                          item.dateObj,
                          horarioTrabalho?.[item.diaSemanaSchema]?.entrada,
                          currentServerTime
                        )
                    );
                    const diasPresentes = diasTrabalho.filter(
                      (item) => item.entrada !== null
                    );
                    return diasTrabalho.length > 0
                      ? Math.round(
                          (diasPresentes.length / diasTrabalho.length) * 100
                        )
                      : 0;
                  })()}
                  %
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

        <div className="quick-actions">
          <Link to="/controle" className="action-card">
            <FaChartBar className="action-icon" />
            <span>Gerar Relatório</span>
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
