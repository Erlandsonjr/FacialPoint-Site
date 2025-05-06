import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, LinearScale, BarElement, CategoryScale } from "chart.js";
import "./Controle.css";

ChartJS.register(LinearScale, BarElement, CategoryScale);

const BarChart = () => {
    const [totalFrequenciaDiaria, setTotalFrequenciaDiaria] = useState([]);
    const [labelsX, setLabelsX] = useState([]);

    useEffect(() => {
        const pegarInfoAPI = async () => {
            try {
                const respostaFetch = await fetch('https://faceponto-banco-dados-production.up.railway.app/frequencias/minhas');
                if (!respostaFetch.ok) {
                    throw new Error('Erro na requisição: ' + respostaFetch.status);
                }

                const jsonRespostaFetch = await respostaFetch.json();
                console.log('Dados da API:', jsonRespostaFetch);

                // 1️Criar uma lista com os últimos 7 dias
                const hoje = new Date();
                const datasUltimosSeteDias = [];
                
                for (let i = 6; i >= 0; i--) {
                    const dataTemp = new Date();
                    dataTemp.setDate(hoje.getDate() - i);
                    const dataFormatada = `${dataTemp.getDate().toString().padStart(2, '0')}/${(dataTemp.getMonth() + 1).toString().padStart(2, '0')}`;
                    datasUltimosSeteDias.push(dataFormatada);
                }

                //  Mapear dados recebidos e preencher dias sem registros
                const dadosTratados = datasUltimosSeteDias.map(data => {
                    const registro = jsonRespostaFetch.find(item => {
                        const dataItem = new Date(item.data);
                        const dataFormatada = `${dataItem.getDate().toString().padStart(2, '0')}/${(dataItem.getMonth() + 1).toString().padStart(2, '0')}`;
                        return dataFormatada === data;
                    });

                    return {
                        x: data,
                        y: registro ? (23 - new Date(registro.horario).getHours()) : 0 // Se não houver registro, define como 0
                    };
                });

                // 3 Atualizar os estados do gráfico
                setLabelsX(datasUltimosSeteDias);
                setTotalFrequenciaDiaria(dadosTratados);
            } catch (error) {
                console.error('ERROR:', error.message);
            }
        };

        pegarInfoAPI();
    }, []);

    if (totalFrequenciaDiaria.length === 0) {
        return <p>Carregando...</p>;
    }

    const dados = {
        labels: labelsX,
        datasets: [{
            label: "Horas trabalhadas semanais",
            data: totalFrequenciaDiaria.map(item => item.y),
            backgroundColor: 'rgba(192, 192, 192, 0.73)',
        }]
    };

    const chartOptions = {
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'category',
                title: {
                    display: true,
                    text: 'Dias da Semana',
                    color: "white",
                },
                ticks: {
                    color: "white",
                    align: "center",
                },
            },
            y: {
                beginAtZero: true,
                ticks: {
                    color: 'white',
                },
                title: {
                    display: true,
                    text: 'Horas Trabalhadas',
                    color: 'white'
                }
            }
        }
    };

    return (
        <div className="grafico-container">
            <Bar data={dados} options={chartOptions} />
        </div>
    );
};

export default BarChart;
