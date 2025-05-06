import './App.css'
import Login from './components/Login_Cadastro/Login';
import { Outlet } from 'react-router-dom';


function App() {
  return (
    <div className='App'>
      <Outlet/>
    </div>
  );
}
export default App