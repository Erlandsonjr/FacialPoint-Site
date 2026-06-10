# FacialPoint — Interface Web

Frontend do sistema FacialPoint, um sistema de registro de ponto por reconhecimento facial.

## Sobre o projeto

O FacialPoint permite que funcionários registrem sua entrada e saída utilizando reconhecimento facial via webcam, sem necessidade de crachás ou senhas. Administradores têm acesso a um dashboard completo com histórico, relatórios e gerenciamento de equipe.

## Tecnologias

- **React 18** com **Vite**
- **React Router** — navegação entre páginas
- **face-api.js** — detecção facial no navegador
- **Chart.js** com **react-chartjs-2** — gráficos de frequência
- **React Icons** — ícones
- **CSS** customizado — estilização sem frameworks externos

## Funcionalidades

**Funcionário**
- Login e cadastro com captura de foto para codificação facial
- Dashboard com histórico de ponto e gráficos de presença
- Exportação do histórico em CSV
- Edição de perfil

**Administrador**
- Dashboard com visão geral de todos os funcionários
- Gerenciamento completo de usuários (criar, editar, excluir)
- Adição manual de registros de ponto
- Configuração de senha do quiosque

**Quiosque (Kiosk)**
- Modo dedicado para registro de ponto por reconhecimento facial em tempo real
- Autenticação protegida por senha para acessar o modo quiosque

## Como executar

**1. Instalar dependências**
```bash
npm install
```

**2. Configurar variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com as URLs dos serviços
```

| Variável | Descrição |
|---|---|
| `VITE_API_BASE` | URL da API backend |
| `VITE_RECONHECIMENTO_API` | URL do serviço de reconhecimento facial |
| `VITE_CODIFICACAO_API` | URL do serviço de codificação facial |

**3. Iniciar em desenvolvimento**
```bash
npm run dev
```

## Repositórios relacionados

- [FacialPoint-Banco-Dados](https://github.com/Erlandsonjr/FacialPoint-Banco-Dados) — API backend (Node.js)
- [FacialPoint-Reconhecimento-Facial](https://github.com/Erlandsonjr/FacialPoint-Reconhecimento-Facial) — Serviço de reconhecimento facial (Python)
- [gerar_codificacao_facialpoint](https://github.com/Erlandsonjr/gerar_codificacao_facialpoint) — Serviço de codificação facial (Python)
