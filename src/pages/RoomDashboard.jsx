import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { ShieldAlert, Activity, Sword, RotateCcw, LogOut, Crosshair, Lock, CheckCircle, AlertTriangle, Users, PowerOff, Terminal, Flame, Settings2 } from 'lucide-react';
import { socket } from '../services/socket';

import fotoInfra from '../assets/infra_boss.jpg';
import fotoLogic from '../assets/logic_boss.jpg';
import fotoSecurity from '../assets/security_boss.jpg';

const BOSS_AVATARS = {
  'infra_boss': fotoInfra,
  'logic_boss': fotoLogic,
  'security_boss': fotoSecurity,
};

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
  
  const savedRooms = JSON.parse(localStorage.getItem('@dungeon:rooms')) || [];
  const currentRoom = savedRooms.find(r => r.id === roomId);
  const initialBossId = currentRoom ? currentRoom.bossId : 'infra_boss';
  const initialBossName = currentRoom ? currentRoom.bossName : 'Professor de DevOps';

  const [gameState, setGameState] = useState({
    boss_hp: 20000,
    max_hp: 20000,
    team_hp: 10000,       // <-- Novo
    max_team_hp: 10000,   // <-- Novo
    status: 'fighting',
    last_action: 'A masmorra foi aberta. Aguardando ataques...',
    active_incident: null,
    incident_timer: 0,
    class_counts: {}, 
    mvp: null,            // <-- Novo
    current_boss: {
      id: initialBossId,
      name: initialBossName,
      weakness: 'devops', 
    }
  });

  const [logs, setLogs] = useState([]);

  useEffect(() => {
    socket.connect();
    socket.emit('join_game', { nickname: 'GAME_MASTER', class: 'admin', room_id: roomId, boss_id: initialBossId });

    socket.on('boss_update', (data) => {
      setGameState(prevState => ({
        ...prevState,
        ...data,
        max_hp: data.current_boss?.max_hp || prevState.max_hp
      }));

      if (data.last_action) {
        setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: data.last_action }, ...prev].slice(0, 25));
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
      setLogs([{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: '🔄 O Administrador resetou a masmorra!' }]);
    }
  };

  // Cálculos das Barras de Vida
  const bossHpPercent = Math.max(0, (gameState.boss_hp / gameState.max_hp) * 100);
  const teamHpPercent = Math.max(0, ((gameState.team_hp || 100) / (gameState.max_team_hp || 100)) * 100);
  
  const hasIncident = gameState.active_incident !== null;
  const isCriticalHp = bossHpPercent < 20;

  let incidentTimerPercent = 0;
  if (hasIncident) {
    const maxTime = gameState.active_incident.duration || 15;
    incidentTimerPercent = Math.max(0, (gameState.incident_timer / maxTime) * 100);
  }
  
  const bossAvatarUrl = BOSS_AVATARS[gameState.current_boss?.id] || fotoInfra;
  
  // Status de Fim de Jogo (Mostra o Telão de Vitória/Derrota)
  const isGameOver = gameState.status === 'victory' || gameState.status === 'defeat';

  const getIncidentTheme = (type) => {
    switch(type) {
      case 'SEQUENCE': return { color: 'border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.2)] bg-green-900/10', text: 'text-green-500', icon: <Terminal size={32} className="text-green-500 animate-pulse" /> };
      case 'RAPID_CLICK': return { color: 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.3)] bg-red-900/20', text: 'text-red-500', icon: <Flame size={32} className="text-red-500 animate-pulse" /> };
      case 'PUZZLE': return { color: 'border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)] bg-blue-900/10', text: 'text-blue-400', icon: <Settings2 size={32} className="text-blue-400 animate-spin-slow" /> };
      default: return { color: 'border-caos shadow-[0_0_30px_rgba(244,63,94,0.15)] bg-dark-800/90', text: 'text-caos', icon: <ShieldAlert size={32} className="text-caos animate-bounce" /> };
    }
  };

  const incidentTheme = hasIncident ? getIncidentTheme(gameState.active_incident.type) : null;

  return (
    <DashboardLayout>
      
      {/* ========================================== */}
      {/* TELA DE OVERLAY: VITÓRIA OU DERROTA + MVP  */}
      {/* ========================================== */}
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-md p-8">
          <div className={`flex flex-col items-center p-16 rounded-3xl border-4 max-w-4xl w-full text-center ${
            gameState.status === 'victory' 
              ? 'border-green-500 bg-green-900/20 shadow-[0_0_100px_rgba(34,197,94,0.3)]' 
              : 'border-red-600 bg-red-900/20 shadow-[0_0_100px_rgba(220,38,38,0.3)]'
          }`}>
            <span className="text-8xl mb-6">{gameState.status === 'victory' ? '🏆' : '💀'}</span>
            <h1 className={`text-6xl font-black mb-4 uppercase tracking-widest ${gameState.status === 'victory' ? 'text-green-400' : 'text-red-500'}`}>
              {gameState.status === 'victory' ? 'VITÓRIA DA TURMA' : 'SISTEMA DESTRUÍDO'}
            </h1>
            
            {gameState.mvp && (
              <div className="mt-12 bg-dark-900 border border-brand-500 p-8 rounded-2xl w-full text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-500/10 animate-pulse pointer-events-none" />
                <h3 className="text-brand-500 font-bold uppercase tracking-widest mb-2">⭐ Jogador Destaque (MVP)</h3>
                <p className="text-5xl font-black text-white uppercase">{gameState.mvp.nickname}</p>
                <p className="text-slate-400 mt-2 text-xl">Esquadrão: <span className="font-bold text-white">{gameState.mvp.class}</span></p>
                <p className="text-3xl font-black text-heal mt-6">+{gameState.mvp.damage} DMG CAUSADO</p>
              </div>
            )}
            
            <button onClick={handleReset} className="mt-12 px-10 py-5 bg-dark-800 border-2 border-slate-600 rounded-xl text-white font-black text-xl hover:bg-slate-700 transition-all">
              INICIAR NOVA BATALHA
            </button>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6 border-b border-dark-700 pb-4 relative z-10">
        <div>
          <h2 className="text-3xl font-black text-white tracking-widest uppercase flex items-center gap-3">
            <Activity className="text-brand-500 animate-pulse" /> 
            TRANSMISSÃO: <span className="text-brand-500">{roomId}</span>
          </h2>
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-warn hover:bg-warn/10 hover:border-warn/30 transition-all font-bold">
            <RotateCcw size={16} /> RESETAR
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-slate-300 hover:text-white transition-colors font-bold">
            <LogOut size={16} /> SAIR
          </button>
        </div>
      </div>

      {/* Grid Principal: 3 Colunas. A Central (Boss) é a maior */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 relative z-10">
        
        {/* COLUNA ESQUERDA: Equipes e Logs */}
        <div className="xl:col-span-1 flex flex-col gap-6 h-full">
          
          {/* Efetivo das Equipes */}
          <div className="glass-card rounded-2xl p-5 border border-dark-700">
            <h3 className="text-sm font-black text-slate-400 mb-4 flex items-center gap-2 uppercase tracking-widest">
              <Users size={16} className="text-brand-500" />
              SQUADS CONECTADOS
            </h3>
            
            <div className="flex flex-col gap-2">
              {TEAM_CLASSES.map(team => {
                const playerCount = gameState.class_counts?.[team.id] || 0;
                const isTarget = hasIncident && gameState.active_incident?.target_class === team.id;
                
                let statusStyle = "bg-dark-900 border-dark-800 text-slate-600 grayscale";
                let statusText = "0 OFF";

                if (playerCount > 0) {
                  if (!hasIncident) {
                    statusStyle = "bg-heal/10 border-heal/30 text-heal";
                    statusText = `${playerCount} ON`;
                  } else if (isTarget) {
                    statusStyle = "bg-caos/20 border-caos animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)] text-caos font-bold";
                    statusText = `${playerCount} ATIVOS`;
                  } else {
                    statusStyle = "bg-dark-800 border-dark-700 text-slate-400 opacity-60";
                    statusText = `${playerCount} TRAVADOS`;
                  }
                }

                return (
                  <div key={team.id} className={`p-3 rounded-lg border flex justify-between items-center transition-all duration-500 ${statusStyle}`}>
                    <span className="text-xs font-bold uppercase tracking-widest">{team.label}</span>
                    <span className="text-xs font-mono">{statusText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Console de Combate (Logs) */}
          <div className="glass-card rounded-2xl flex flex-col overflow-hidden flex-1 border border-dark-700 min-h-[300px]">
            <div className="p-3 border-b border-dark-700 bg-dark-900 flex justify-between items-center">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Terminal size={14} className="text-brand-500" /> TERMINAL
              </h3>
              <div className="w-2 h-2 rounded-full bg-heal animate-ping" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-[#050505] flex flex-col-reverse custom-scrollbar">
              {logs.length === 0 ? (
                <p className="text-slate-600 text-xs text-center italic mt-10">Aguardando tráfego de rede...</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-[11px] font-mono leading-tight animate-[fadeIn_0.2s_ease-out]">
                    <span className="text-dark-400 mr-2">[{log.time}]</span>
                    <span className={`
                      ${log.msg.includes('CRÍTICO') || log.msg.includes('Resetou') || log.msg.includes('Tempo Esgotado') ? 'text-warn font-bold' : 'text-green-500'} 
                      ${log.msg.includes('salvou') || log.msg.includes('curou') ? 'text-heal font-bold' : ''}
                      ${log.msg.includes('COMPROMETIDO') ? 'text-caos font-bold' : ''}
                    `}>
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* COLUNA CENTRAL & DIREITA: Boss "TELÃO" e Incidente */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* ========================================== */}
          {/* TELÃO DO BOSS + VIDA DA EQUIPE NO TOPO      */}
          {/* ========================================== */}
          <div className={`glass-card rounded-3xl p-8 relative overflow-hidden transition-all duration-500 border-2 ${isCriticalHp ? 'border-caos shadow-[0_0_50px_rgba(244,63,94,0.3)] bg-dark-900' : 'border-dark-700 bg-dark-800/50'}`}>
            {isCriticalHp && <div className="absolute inset-0 bg-caos/5 animate-pulse pointer-events-none" />}
            
            {/* VIDA DA EQUIPE */}
            <div className="mb-8 border-b border-dark-700 pb-6 relative z-10">
               <div className="flex justify-between items-end mb-2">
                 <span className="text-xl font-black text-heal uppercase tracking-widest flex items-center gap-2">
                   ❤️ INTEGRIDADE DOS ALUNOS
                 </span>
                 <span className="text-2xl font-black text-white">{gameState.team_hp || 0} HP</span>
               </div>
               <div className="h-6 w-full bg-dark-950 rounded-xl overflow-hidden border border-dark-900 shadow-inner">
                  <div className={`h-full transition-all duration-500 ${teamHpPercent < 30 ? 'bg-red-500' : 'bg-heal'}`} style={{ width: `${teamHpPercent}%` }} />
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              {/* Foto Gigante */}
              <div className="relative">
                <img 
                  src={bossAvatarUrl} 
                  alt="Boss Avatar" 
                  className={`w-40 h-40 md:w-56 md:h-56 rounded-full object-cover border-4 ${isCriticalHp ? 'border-caos animate-pulse' : 'border-dark-600'} bg-dark-900 shadow-2xl`} 
                />
                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase border-2 ${isCriticalHp ? 'bg-caos text-white border-caos' : 'bg-dark-900 text-brand-500 border-brand-500'}`}>
                  {isCriticalHp ? 'CRÍTICO' : 'ESTÁVEL'}
                </div>
              </div>

              {/* Info do Boss */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-lg">{gameState.current_boss.name}</h3>
                
                <div className="flex justify-between items-end mb-2 mt-8">
                  <span className="text-xl font-bold text-caos uppercase tracking-widest">HP DO CHEFE</span>
                  <div className="text-right">
                    <span className={`text-6xl font-black drop-shadow-md ${isCriticalHp ? 'text-caos' : 'text-white'}`}>
                      {gameState.boss_hp}
                    </span>
                  </div>
                </div>

                <div className="h-10 w-full bg-dark-950 rounded-2xl overflow-hidden border-2 border-dark-900 shadow-inner p-1">
                  <div 
                    className={`h-full rounded-xl transition-all duration-500 ease-out relative overflow-hidden ${isCriticalHp ? 'bg-caos' : 'bg-brand-500'}`}
                    style={{ width: `${bossHpPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INCIDENTE TEMÁTICO GIGANTE */}
          <div className={`rounded-3xl transition-all duration-500 border-2 overflow-hidden flex-1 flex flex-col justify-center min-h-[250px] ${
              hasIncident ? incidentTheme.color : 'border-dashed border-dark-700 bg-dark-900/30'
            }`}
          >
            {hasIncident ? (
              <div className="relative p-8 h-full flex flex-col justify-center">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                  
                  {/* Ícone e Título */}
                  <div className="flex flex-col items-center md:items-start flex-1 text-center md:text-left">
                    <div className="flex items-center gap-4 mb-3">
                      {incidentTheme.icon}
                      <h4 className={`${incidentTheme.text} font-black text-3xl tracking-widest uppercase drop-shadow-md`}>
                        {gameState.active_incident.title}
                      </h4>
                    </div>
                    <p className="text-slate-300 font-medium text-xl leading-relaxed max-w-2xl">
                      {gameState.active_incident.description}
                    </p>
                  </div>
                  
                  {/* Status do Incidente (Alvo e Tempo) */}
                  <div className="flex flex-col gap-4 w-full md:w-auto md:min-w-[300px]">
                    <div className="bg-dark-950/80 backdrop-blur border border-dark-700 p-5 rounded-2xl flex justify-between items-center shadow-lg">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Equipe Acionada</span>
                        <span className={`${incidentTheme.text} font-black text-2xl uppercase`}>{gameState.active_incident.target_class}</span>
                      </div>
                      <Crosshair className={incidentTheme.text} size={32} opacity={0.5} />
                    </div>

                    <div className="bg-dark-950/80 backdrop-blur p-5 rounded-2xl border border-dark-700 shadow-lg">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full animate-ping ${hasIncident ? (incidentTheme.text.replace('text', 'bg')) : ''}`} />
                          Tempo P/ Falha Crítica
                        </span>
                        <span className={`text-3xl font-black drop-shadow-md ${incidentTheme.text}`}>{gameState.incident_timer}s</span>
                      </div>
                      
                      <div className="h-4 w-full bg-dark-900 rounded-full overflow-hidden border border-dark-800 shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ease-linear relative ${hasIncident ? (incidentTheme.text.replace('text', 'bg')) : ''}`}
                          style={{ width: `${incidentTimerPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 opacity-60">
                <ShieldAlert className="text-slate-600 mb-4 animate-pulse-slow" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-lg mb-2">Monitor de Infraestrutura Ativo</p>
                <p className="text-slate-500 font-mono">Status: 200 OK. Aguardando anomalias no sistema...</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}