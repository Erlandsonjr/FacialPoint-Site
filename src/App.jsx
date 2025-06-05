import Login from './components/Login_Cadastro/Login';
import { Outlet, useLocation } from 'react-router-dom';

function App() {
  const location = useLocation();
  const isRegistro = location.pathname === "/registro";

  return (
    <div className={isRegistro ? "" : "page-container"}>
      <Outlet/>
    </div>
  );
}
export default App;