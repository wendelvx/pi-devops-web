import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Play, ShieldAlert, Cpu, Code2, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function Home() {
  const [roomId, setRoomId] = useState('');
  const [bossId, setBossId] = useState('infra_boss');
  const [activeRooms, setActiveRooms] = useState([]);
  const navigate = useNavigate();

  // Carrega as salas do localStorage ao abrir a tela
  useEffect(() => {
    const savedRooms = JSON.parse(localStorage.getItem('@dungeon:rooms')) || [];
    setActiveRooms(savedRooms);
  }, []);

  const bosses = [
    { id: 'infra_boss', name: 'Professor de DevOps', icon: <Cpu className="text-warn" />, desc: 'Mestre dos Containers', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=infra_boss&backgroundColor=f59e0b' },
    { id: 'logic_boss', name: 'Professor de Back-end', icon: <Code2 className="text-brand-500" />, desc: 'Especialista em Algoritmos', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=logic_boss&backgroundColor=6366f1' },
    { id: 'security_boss', name: 'Professor de Security', icon: <ShieldAlert className="text-caos" />, desc: 'Guardião do Firewall', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=security_boss&backgroundColor=f43f5e' },
  ];

  const handleLaunch = (e) => {
    e.preventDefault();
    if(!roomId.trim()) return;
    
    // Pega o boss selecionado para salvar na lista
    const selected = bosses.find(b => b.id === bossId);
    
    // Salva a nova sala no LocalStorage para o Admin poder navegar depois
    const newRoom = { id: roomId,bossId: selected.id, bossName: selected.name, avatar: selected.avatar, createdAt: new Date().toISOString() };
    const updatedRooms = [newRoom, ...activeRooms.filter(r => r.id !== roomId)];
    
    localStorage.setItem('@dungeon:rooms', JSON.stringify(updatedRooms));
    
    navigate(`/room/${roomId}`);
  };

  const removeRoom = (idToRemove) => {
    const updatedRooms = activeRooms.filter(r => r.id !== idToRemove);
    setActiveRooms(updatedRooms);
    localStorage.setItem('@dungeon:rooms', JSON.stringify(updatedRooms));
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Nova Instância</h2>
        <p className="text-slate-400 mt-2">Configure os parâmetros da batalha e o boss alvo antes de liberar o acesso aos alunos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Criar Sala */}
        <div className="col-span-1 lg:col-span-2 glass-card rounded-2xl p-8 border border-dark-700 h-fit">
          <form onSubmit={handleLaunch} className="space-y-8">
            <div>
              <label className="block text-sm font-semibold tracking-wide text-slate-300 mb-2 uppercase">
                ID da Instância (Room ID)
              </label>
              <input 
                type="text" 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Ex: ADS-NOITE"
                className="w-full bg-dark-900/50 border border-dark-700 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-brand-500 transition-all font-mono text-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold tracking-wide text-slate-300 mb-3 uppercase">
                Selecionar Boss (Professor)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bosses.map((boss) => (
                  <button
                    key={boss.id}
                    type="button"
                    onClick={() => setBossId(boss.id)}
                    className={`flex items-center gap-4 p-3 rounded-xl border text-left transition-all duration-200 ${
                      bossId === boss.id 
                        ? 'bg-brand-500/10 border-brand-500/50 shadow-[inset_0_0_15px_rgba(99,102,241,0.15)]' 
                        : 'bg-dark-900/30 border-dark-700 hover:border-slate-600'
                    }`}
                  >
                    <img src={boss.avatar} alt="Boss Avatar" className="w-12 h-12 rounded-lg bg-dark-800" />
                    <div>
                      <h3 className="font-bold text-white text-sm">{boss.name}</h3>
                      <p className="text-xs text-slate-400">{boss.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-3 glow-brand transition-all uppercase tracking-widest"
            >
              <Play size={20} className="fill-current" />
              Inicializar Masmorra
            </button>
          </form>
        </div>

        {/* Lado Direito: Salas em Andamento */}
        <div className="col-span-1 space-y-4">
          <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest">Salas Ativas</h3>
          
          {activeRooms.length === 0 ? (
            <div className="bg-dark-800 border border-dark-700 border-dashed rounded-xl p-8 flex flex-col items-center text-center">
              <p className="text-slate-400">Nenhuma sala ativa no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeRooms.map((room) => (
                <div key={room.id} className="glass-card p-4 rounded-xl flex justify-between items-center group">
                  <Link to={`/room/${room.id}`} className="flex items-center gap-3 flex-1">
                    <img src={room.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-dark-700" />
                    <div>
                      <h4 className="text-white font-bold">{room.id}</h4>
                      <p className="text-xs text-slate-400">{room.bossName}</p>
                    </div>
                  </Link>
                  <button onClick={() => removeRoom(room.id)} className="p-2 text-slate-600 hover:text-caos transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}