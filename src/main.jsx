import React from 'react';
import ReactDom from 'react-dom/client';
import App from './App.jsx';
import "./index.css"
import {createBrowserRouter, RouterProvider} from 'react-router-dom';

import Login from './components/Login_Cadastro/Login.jsx'
import Cadastro from './components/Login_Cadastro/Cadastro.jsx'
import RegistroPonto from './components/Registro/registro.jsx';
import Home from './components/Home/home.jsx';
import Perfil from './components/Perfil/Perfil.jsx';
import Admin from './components/AdminDash/admin.jsx';
import HomePage from './components/Home/HomePage.jsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <HomePage />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "cadastro",
        element: <Cadastro />,
      },
      {
        path: "registro",
        element: <RegistroPonto />,
      },
      {
        path: "funcionario/dashboard",
        element: <Home />,
      },
      {
        path: "perfil",
        element: <Perfil />,
      },
      {
        path: "admin/dashboard",
        element: <Admin />,
      }
    ]
  },
])

ReactDom.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)