import React, { Children } from 'react';
import ReactDom from 'react-dom/client';
import App from './App.jsx';
import "./index.css"
import {createBrowserRouter, RouterProvider} from 'react-router-dom';

import Login from './components/Login_Cadastro/Login.jsx'
import Cadastro from './components/Login_Cadastro/Cadastro.jsx'
import Controle from "./components/Controle/Controle.jsx"


const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "/",
        element: <Login />,
      },
      {
        path: "signup",
        element: <Cadastro />,
      },
      {
        path:"controle",
        element: <Controle />,
      },
    ]
  },
])

ReactDom.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)