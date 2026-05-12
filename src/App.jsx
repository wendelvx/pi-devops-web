import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { RoomDashboard } from './pages/RoomDashboard'; // Importando a tela completa!

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<RoomDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;