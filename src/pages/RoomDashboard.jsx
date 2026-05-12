import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { ShieldAlert, Activity, Sword, RotateCcw, LogOut, Crosshair, Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { socket } from '../services/socket';

const TEAM_CLASSES = [
  { id: 'front-end', label: 'Front-end' },
  { id: 'back-end', label: 'Back-end' },
  { id: 'devops', label: 'DevOps' },
  { id: 'qa', label: 'QA Tester' },
  { id: 'security', label: 'Security' }
];

export function RoomDashboard() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  // 1. Lê a sala salva para iniciar o estado sem "piscar" a tela
  const savedRooms = JSON.parse(localStorage.getItem('@dungeon:rooms')) || [];
  const currentRoom = savedRooms.find(r => r.id === roomId);
  const initialBossId = currentRoom ? currentRoom.bossId : 'infra_boss';
  const initialBossName = currentRoom ? currentRoom.bossName : 'Professor de DevOps';

  // 2. Injeta os dados reais logo na primeira renderização
  const [gameState, setGameState] = useState({
    boss_hp: 20000,
    max_hp: 20000,
    status: 'fighting',
    last_action: 'A masmorra foi aberta. Aguardando ataques...',
    active_incident: null,
    incident_timer: 0,
    current_boss: {
      id: initialBossId,
      name: initialBossName,
      weakness: 'devops', 
    }
  });

  const [logs, setLogs] = useState([]);

  useEffect(() => {
    socket.connect();
    // 3. Envia o boss_id para o servidor!
    socket.emit('join_game', { nickname: 'GAME_MASTER', class: 'admin', room_id: roomId, boss_id: initialBossId });

    socket.on('boss_update', (data) => {
      setGameState(prevState => ({
        ...prevState,
        ...data,
        max_hp: data.current_boss?.max_hp || prevState.max_hp
      }));

      if (data.last_action) {
        setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg: data.last_action }, ...prev].slice(0, 15));
      }
    });

    return () => {
      socket.off('boss_update');
      socket.disconnect();
    };
  }, [roomId, initialBossId]);

  const handleReset = () => {
    if(window.confirm("Atenção! Isso irá restaurar a vida do Boss e limpar os incidentes. Deseja continuar?")) {
      socket.emit('admin_reset_room', { room_id: roomId });
      setLogs([{ time: new Date().toLocaleTimeString(), msg: '🔄 O Administrador resetou a masmorra!' }]);
    }
  };

  // Cálculos de Porcentagem para as Barras Visuais
  const hpPercentage = Math.max(0, (gameState.boss_hp / gameState.max_hp) * 100);
  
  const hasIncident = gameState.active_incident !== null;
  let incidentTimerPercent = 0;
  if (hasIncident) {
    const maxTime = gameState.active_incident.duration || 15;
    incidentTimerPercent = Math.max(0, (gameState.incident_timer / maxTime) * 100);
  }
  
  const bossAvatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${gameState.current_boss?.id || 'default'}&backgroundColor=1e293b`;

  return (
    <DashboardLayout>
      {/* Cabeçalho da Sala */}
      <div className="flex justify-between items-center mb-8 border-b border-dark-700 pb-5">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Activity className="text-brand-500 animate-pulse" /> 
            Instância Ativa: <span className="text-brand-500">{roomId}</span>
          </h2>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-warn hover:bg-warn/10 hover:border-warn/30 transition-all"
          >
            <RotateCcw size={16} /> Resetar Batalha
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-slate-300 hover:text-white transition-colors"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA */}
        <div className="col-span-2 space-y-6">
          
          {/* Card do Boss */}
          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <img 
                  src={bossAvatarUrl} 
                  alt="Boss Avatar" 
                  className={`w-20 h-20 rounded-xl border-2 ${hpPercentage < 20 ? 'border-caos animate-pulse' : 'border-dark-700'} bg-dark-900 shadow-lg`} 
                />
                <div>
                  <h3 className="text-2xl font-bold text-white">{gameState.current_boss.name}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Fraqueza Técnica: <span className="uppercase text-brand-500 font-bold">{gameState.current_boss.weakness}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-4xl font-black text-white">{gameState.boss_hp}</p>
                <p className="text-xs text-slate-500 uppercase tracking-widest">HP Restante</p>
              </div>
            </div>

            <div className="h-6 w-full bg-dark-900 rounded-full overflow-hidden border border-dark-700">
              <div 
                className={`h-full transition-all duration-500 ease-out ${hpPercentage < 20 ? 'bg-caos' : 'bg-brand-500'} relative`}
                style={{ width: `${hpPercentage}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
              </div>
            </div>
          </div>

          {/* NOVO: Grid de Status das Equipes */}
          <div className="glass-card rounded-2xl p-6 border border-dark-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={20} className="text-brand-500" />
              Status de Conexão das Equipes
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {TEAM_CLASSES.map(team => {
                const isTarget = hasIncident && gameState.active_incident?.target_class === team.id;
                const isLocked = hasIncident && !isTarget;

                // Lógica de renderização por estado da classe
                let statusStyle = "bg-dark-800 border-dark-700 text-slate-400";
                let StatusIcon = Lock;
                let statusText = "TRAVADO";

                if (!hasIncident) {
                  statusStyle = "bg-heal/10 border-heal/30 text-heal";
                  StatusIcon = CheckCircle;
                  statusText = "ONLINE";
                } else if (isTarget) {
                  statusStyle = "bg-caos/20 border-caos animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)] text-caos";
                  StatusIcon = AlertTriangle;
                  statusText = "RESOLVENDO";
                }

                return (
                  <div key={team.id} className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-500 ${statusStyle} ${isLocked ? 'opacity-50 grayscale' : ''}`}>
                    <StatusIcon size={24} className="mb-1" />
                    <span className="text-xs font-bold uppercase tracking-widest text-center">{team.label}</span>
                    <span className="text-[10px] font-mono opacity-80">{statusText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card de Incidente (Painel Dinâmico) */}
          <div className={`rounded-2xl transition-all duration-300 border overflow-hidden ${
              hasIncident ? 'glow-caos bg-dark-800/90 border-caos/50 shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'glass-card border-dark-700 p-6'
            }`}
          >
            {hasIncident ? (
              <div className="relative p-6">
                <div className="absolute inset-0 bg-caos/5 animate-pulse pointer-events-none" />
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="text-caos animate-bounce" size={24} />
                        <h4 className="text-caos font-black text-xl tracking-wider uppercase">
                          {gameState.active_incident.title}
                        </h4>
                      </div>
                      <p className="text-slate-300 font-medium text-lg">{gameState.active_incident.description}</p>
                    </div>
                    
                    <div className="bg-dark-900 border-2 border-caos/60 px-5 py-3 rounded-xl flex flex-col items-center justify-center min-w-[140px] shadow-lg">
                      <Crosshair className="text-slate-400 mb-1" size={16} />
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Equipe Exigida</span>
                      <span className="text-white font-black text-lg uppercase mt-1">{gameState.active_incident.target_class}</span>
                    </div>
                  </div>

                  <div className="mt-4 bg-dark-900/50 p-4 rounded-xl border border-dark-700">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-caos animate-ping" />
                        Tempo Restante para Falha
                      </span>
                      <span className="text-2xl font-black text-caos drop-shadow-md">{gameState.incident_timer}s</span>
                    </div>
                    
                    <div className="h-5 w-full bg-dark-950 rounded-full overflow-hidden border border-dark-900 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-caos to-red-500 transition-all duration-1000 ease-linear relative"
                        style={{ width: `${incidentTimerPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_1s_infinite]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 border border-dashed border-dark-700 rounded-xl opacity-70">
                <ShieldAlert className="text-slate-600 mb-3" size={32} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Monitor de Infraestrutura</p>
                <p className="text-slate-500 mt-1">Sistemas operacionais. Nenhuma anomalia detectada.</p>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Feed */}
        <div className="col-span-1 glass-card rounded-2xl flex flex-col overflow-hidden max-h-[750px]">
          <div className="p-5 border-b border-dark-700 flex items-center gap-3 bg-dark-800/50">
            <Sword className="text-brand-500" size={20} />
            <h3 className="font-bold text-white">Console de Combate</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-dark-900/30 flex flex-col-reverse">
            {logs.length === 0 ? (
              <p className="text-slate-500 text-sm text-center italic mt-10">Nenhum ataque registrado.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-sm bg-dark-800 p-3 rounded-lg border border-dark-700 shadow-sm animate-[fadeIn_0.3s_ease-out]">
                  <span className="text-xs text-brand-500 block mb-1 font-mono">{log.time}</span>
                  <span className={`text-slate-200 ${log.msg.includes('CRÍTICO') || log.msg.includes('Resetou') ? 'text-warn font-bold' : ''} ${log.msg.includes('salvou') ? 'text-heal font-bold' : ''}`}>
                    {log.msg}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}