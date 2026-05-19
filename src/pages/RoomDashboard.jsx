import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
// 1. IMPORTADO O ÍCONE 'Play' AQUI
import { ShieldAlert, Activity, RotateCcw, LogOut, Crosshair, Users, Terminal, Flame, Settings2, AlertTriangle, X, Play } from 'lucide-react';
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
    team_hp: 10000,
    max_team_hp: 10000,
    status: 'waiting', // Começa esperando
    last_action: 'Carregando estado da masmorra...',
    active_incident: null,
    incident_timer: 0,
    class_counts: {}, 
    mvp: null,
    current_boss: {
      id: initialBossId,
      name: initialBossName,
      weakness: 'devops', 
    }
  });

  const [logs, setLogs] = useState([]);
  const [showResetModal, setShowResetModal] = useState(false);
  const lastActionRef = useRef('');

  useEffect(() => {
    socket.connect();

    const onAdminConnect = () => {
      // 1. Lemos a flag que a Home.tsx salva. 
      // Se for "true", significa que o admin acabou de criar a sala neste exato momento.
      const isNewRoom = sessionStorage.getItem(`@dungeon:room_created_${roomId}`);

      if (isNewRoom === "true") {
        // Envia APENAS o JOIN_GAME. O backend Node.js já está programado para disparar
        // uma atualização de estado automaticamente no final do join_game.
        socket.emit('join_game', { 
          nickname: 'GAME_MASTER', 
          class: 'admin', 
          room_id: roomId, 
          boss_id: initialBossId 
        });
        
        // Removemos a flag para que um simples F5 (refresh) não tente recriar a sala.
        sessionStorage.removeItem(`@dungeon:room_created_${roomId}`);
      } else {
        // 2. Se for falso, é apenas o admin reconectando ou dando refresh na página.
        // A sala já existe no Go, então entramos como espectador e pedimos o estado.
        socket.emit('join_admin_spectator', { room_id: roomId });
        socket.emit('admin_request_state', { room_id: roomId }); 
      }
    };

    // Validação contra os re-renders do Strict Mode do React 18
    if (socket.connected) {
      onAdminConnect();
    } else {
      socket.on('connect', onAdminConnect);
    }

    socket.on('boss_update', (data) => {
      setGameState(prevState => ({
        ...prevState,
        ...data,
        max_hp: data.current_boss?.max_hp || prevState.max_hp
      }));

      if (data.last_action && data.last_action !== lastActionRef.current) {
        lastActionRef.current = data.last_action;
        setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: data.last_action }, ...prev].slice(0, 30));
      }
    });

    return () => {
      socket.off('connect', onAdminConnect);
      socket.off('boss_update');
      socket.disconnect();
    };
  }, [roomId, initialBossId]);

  const confirmReset = () => {
    socket.emit('admin_reset_room', { room_id: roomId });
    lastActionRef.current = '🔄 O Administrador resetou a masmorra!';
    setLogs([{ id: Date.now(), time: new Date().toLocaleTimeString(), msg: '🔄 O Administrador resetou a masmorra!' }]);
    setShowResetModal(false);
  };

  // 2. NOVA FUNÇÃO PARA INICIAR A BATALHA
  const handleStartBattle = () => {
    socket.emit('admin_start_battle', { room_id: roomId });
  };

  const bossHpPercent = Math.max(0, (gameState.boss_hp / gameState.max_hp) * 100);
  const teamHpPercent = Math.max(0, ((gameState.team_hp || 100) / (gameState.max_team_hp || 100)) * 100);
  
  const hasIncident = gameState.active_incident !== null;
  const isCriticalHp = bossHpPercent < 20;

  let incidentTimerPercent = 0;
  let resolutionProgressPercent = 0;

  if (hasIncident) {
    const maxTime = gameState.active_incident.duration || 15;
    incidentTimerPercent = Math.max(0, (gameState.incident_timer / maxTime) * 100);
    
    const reqRes = gameState.active_incident.required_resolutions || 1;
    const curRes = gameState.active_incident.current_resolutions || 0;
    resolutionProgressPercent = Math.min(100, Math.max(0, (curRes / reqRes) * 100));
  }
  
  const bossAvatarUrl = BOSS_AVATARS[gameState.current_boss?.id] || fotoInfra;
  const isGameOver = gameState.status === 'victory' || gameState.status === 'defeat';

  const getIncidentTheme = (type) => {
    switch(type) {
      case 'SEQUENCE': return { color: 'border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.2)] bg-green-900/10', text: 'text-green-500', icon: <Terminal size={28} className="text-green-500 animate-pulse" /> };
      case 'RAPID_CLICK': return { color: 'border-red-600 shadow-[0_0_40px_rgba(220,38,38,0.3)] bg-red-900/20', text: 'text-red-500', icon: <Flame size={28} className="text-red-500 animate-pulse" /> };
      case 'PUZZLE': return { color: 'border-blue-500 shadow-[0_0_40px_rgba(59,130,246,0.2)] bg-blue-900/10', text: 'text-blue-400', icon: <Settings2 size={28} className="text-blue-400 animate-spin-slow" /> };
      default: return { color: 'border-caos shadow-[0_0_30px_rgba(244,63,94,0.15)] bg-dark-800/90', text: 'text-caos', icon: <ShieldAlert size={28} className="text-caos animate-bounce" /> };
    }
  };

  const incidentTheme = hasIncident ? getIncidentTheme(gameState.active_incident.type) : null;

  return (
    <DashboardLayout>
      
      {/* ---------------- MODAL ELEGANTE DE CONFIRMAÇÃO DE RESET ---------------- */}
      {showResetModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-dark-950/80 backdrop-blur-sm p-4">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-warn/10 rounded-xl">
                <AlertTriangle className="text-warn" size={28} />
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">Atenção, Administrador!</h3>
            <p className="text-slate-300 mb-6 text-sm leading-relaxed">
              Você está prestes a resetar a sala <span className="font-bold text-warn">{roomId}</span>. Isso irá restaurar a vida do Boss, curar a equipe e limpar todos os incidentes ativos. Deseja prosseguir?
            </p>
            
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowResetModal(false)} className="px-4 py-2 rounded-lg font-bold text-slate-300 hover:bg-dark-700 transition-colors">
                CANCELAR
              </button>
              <button onClick={confirmReset} className="px-4 py-2 bg-warn text-dark-950 rounded-lg font-bold hover:bg-yellow-400 transition-colors shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                SIM, RESETAR
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------------------- */}

      {isGameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-md p-8">
          <div className={`flex flex-col items-center p-12 rounded-3xl border-4 max-w-3xl w-full text-center ${
            gameState.status === 'victory' 
              ? 'border-green-500 bg-green-900/20 shadow-[0_0_100px_rgba(34,197,94,0.3)]' 
              : 'border-red-600 bg-red-900/20 shadow-[0_0_100px_rgba(220,38,38,0.3)]'
          }`}>
            <span className="text-7xl mb-4">{gameState.status === 'victory' ? '🏆' : '💀'}</span>
            <h1 className={`text-5xl font-black mb-4 uppercase tracking-widest ${gameState.status === 'victory' ? 'text-green-400' : 'text-red-500'}`}>
              {gameState.status === 'victory' ? 'VITÓRIA DA TURMA' : 'SISTEMA DESTRUÍDO'}
            </h1>
            
            {gameState.mvp && (
              <div className="mt-8 bg-dark-900 border border-brand-500 p-6 rounded-2xl w-full text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-500/10 animate-pulse pointer-events-none" />
                <h3 className="text-brand-500 font-bold uppercase tracking-widest mb-1">⭐ Jogador Destaque (MVP)</h3>
                <p className="text-4xl font-black text-white uppercase">{gameState.mvp.nickname}</p>
                <p className="text-slate-400 mt-1 text-lg">Esquadrão: <span className="font-bold text-white">{gameState.mvp.class}</span></p>
                <p className="text-2xl font-black text-heal mt-4">+{gameState.mvp.damage} DMG CAUSADO</p>
              </div>
            )}
            
            <button onClick={() => setShowResetModal(true)} className="mt-10 px-8 py-4 bg-dark-800 border-2 border-slate-600 rounded-xl text-white font-black text-lg hover:bg-slate-700 transition-all">
              INICIAR NOVA BATALHA
            </button>
          </div>
        </div>
      )}

      {/* CABEÇALHO COMPACTO */}
      <div className="flex justify-between items-center mb-4 border-b border-dark-700 pb-3 relative z-10">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black text-white tracking-widest uppercase flex items-center gap-3">
            <Activity className="text-brand-500 animate-pulse" size={24} /> 
            TRANSMISSÃO: <span className="text-brand-500">{roomId}</span>
          </h2>
          
          {/* 3. BOTÃO DE START APARECE APENAS ENQUANTO AGUARDA */}
          {gameState.status === 'waiting' && (
            <button 
              onClick={handleStartBattle}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(22,163,74,0.4)] animate-pulse"
            >
              <Play size={18} className="fill-current" /> LIBERAR ATAQUE
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {/* BOTÃO QUE CHAMA O MODAL */}
          <button onClick={() => setShowResetModal(true)} className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-warn hover:bg-warn/10 hover:border-warn/30 transition-all text-sm font-bold">
            <RotateCcw size={14} /> RESETAR
          </button>
          <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-slate-300 hover:text-white transition-colors text-sm font-bold">
            <LogOut size={14} /> SAIR
          </button>
        </div>
      </div>

      {/* GRID PRINCIPAL: 100% da altura da tela menos o cabeçalho */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-[calc(100vh-120px)] relative z-10">
        
        {/* COLUNA ESQUERDA: Equipes e Logs */}
        <div className="xl:col-span-1 flex flex-col gap-4 h-full min-h-0">
          
          <div className="glass-card rounded-2xl p-4 border border-dark-700 shrink-0">
            <h3 className="text-xs font-black text-slate-400 mb-3 flex items-center gap-2 uppercase tracking-widest">
              <Users size={14} className="text-brand-500" /> SQUADS CONECTADOS
            </h3>
            
            <div className="flex flex-col gap-1.5">
              {TEAM_CLASSES.map(team => {
                const playerCount = gameState.class_counts?.[team.id] || 0;
                const isTarget = hasIncident && gameState.active_incident?.target_class === team.id;
                
                let statusStyle = "bg-dark-900 border-dark-800 text-slate-600 grayscale";
                let statusText = "0 OFFLINE";

                if (playerCount > 0) {
                  if (!hasIncident) {
                    statusStyle = "bg-heal/10 border-heal/30 text-heal";
                    statusText = `${playerCount} ONLINE`;
                  } else if (isTarget) {
                    statusStyle = "bg-caos/20 border-caos animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.3)] text-caos font-bold";
                    statusText = `${playerCount} ATIVOS`;
                  } else {
                    statusStyle = "bg-dark-800 border-dark-700 text-slate-400 opacity-60";
                    statusText = `${playerCount} TRAVADOS`;
                  }
                }

                return (
                  <div key={team.id} className={`p-2 px-3 rounded-lg border flex justify-between items-center transition-all duration-500 ${statusStyle}`}>
                    <span className="text-[10px] font-bold uppercase tracking-widest">{team.label}</span>
                    <span className="text-[10px] font-mono">{statusText}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Console de Combate - Ocupará o resto da altura automaticamente */}
          <div className="glass-card rounded-2xl flex flex-col flex-1 border border-dark-700 min-h-0 overflow-hidden">
            <div className="p-2.5 border-b border-dark-700 bg-dark-900 flex justify-between items-center shrink-0">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Terminal size={12} className="text-brand-500" /> TERMINAL
              </h3>
              <div className="w-1.5 h-1.5 rounded-full bg-heal animate-ping" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#050505] flex flex-col-reverse custom-scrollbar">
              {logs.length === 0 ? (
                <p className="text-slate-600 text-xs text-center italic mt-4">Aguardando tráfego...</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-[10px] font-mono leading-relaxed animate-[fadeIn_0.2s_ease-out] border-l-2 border-dark-700 pl-2">
                    <span className="text-dark-400 mr-2">[{log.time}]</span>
                    <span className={`
                      ${log.msg.includes('CRÍTICO') || log.msg.includes('Resetou') || log.msg.includes('Tempo Esgotado') ? 'text-warn font-bold' : 'text-slate-300'} 
                      ${log.msg.includes('salvou') || log.msg.includes('NEUTRALIZOU') || log.msg.includes('sucesso') || log.msg.includes('COMEÇOU') ? 'text-heal font-bold' : ''}
                      ${log.msg.includes('COMPROMETIDO') ? 'text-caos font-bold' : ''}
                      ${log.msg.includes('atacou') ? 'text-brand-400' : ''}
                      ${log.msg.includes('degradação') ? 'text-orange-500/80 italic' : ''}
                      ${log.msg.includes('Contribuindo') ? 'text-blue-400' : ''}
                    `}>
                      {log.msg.replace('!', '')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* COLUNA CENTRAL & DIREITA: Boss "TELÃO" e Incidente */}
        <div className="xl:col-span-3 flex flex-col gap-4 h-full min-h-0">
          
          <div className={`glass-card rounded-3xl p-6 relative overflow-hidden transition-all duration-500 border-2 shrink-0 ${isCriticalHp ? 'border-caos shadow-[0_0_50px_rgba(244,63,94,0.3)] bg-dark-900' : 'border-dark-700 bg-dark-800/50'}`}>
            {isCriticalHp && <div className="absolute inset-0 bg-caos/5 animate-pulse pointer-events-none" />}
            
            {/* VIDA DA EQUIPE COMPACTA */}
            <div className="mb-4 border-b border-dark-700 pb-4 relative z-10">
               <div className="flex justify-between items-end mb-1.5">
                 <span className="text-sm font-black text-heal uppercase tracking-widest flex items-center gap-1.5">
                   ❤️ INTEGRIDADE DA TURMA
                 </span>
                 <span className="text-xl font-black text-white">
                    {gameState.team_hp || 0} <span className="text-slate-500 text-sm font-bold">/ {gameState.max_team_hp || 10000}</span>
                 </span>
               </div>
               <div className="h-4 w-full bg-dark-950 rounded-lg overflow-hidden border border-dark-900 shadow-inner">
                  <div className={`h-full transition-all duration-500 ${teamHpPercent < 30 ? 'bg-red-500' : 'bg-heal'}`} style={{ width: `${teamHpPercent}%` }} />
               </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
              {/* FOTO DO BOSS REDUZIDA */}
              <div className="relative shrink-0">
                <img 
                  src={bossAvatarUrl} 
                  alt="Boss Avatar" 
                  className={`w-32 h-32 lg:w-48 lg:h-48 rounded-full object-cover border-[6px] ${isCriticalHp ? 'border-caos animate-pulse' : 'border-dark-600'} bg-dark-900 shadow-xl`} 
                />
                <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border-2 shadow-xl whitespace-nowrap ${isCriticalHp ? 'bg-caos text-white border-white' : 'bg-dark-900 text-brand-500 border-brand-500'}`}>
                  {isCriticalHp ? 'CRÍTICO' : 'ESTÁVEL'}
                </div>
              </div>

              {/* Info do Boss */}
              <div className="flex-1 text-center md:text-left w-full mt-2 md:mt-0">
                <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-2 drop-shadow-lg leading-none">{gameState.current_boss.name}</h3>
                
                <div className="flex justify-between items-end mb-2 mt-4">
                  <span className="text-lg font-black text-caos uppercase tracking-widest">HP DO CHEFE</span>
                  <div className="text-right">
                    <span className={`text-4xl lg:text-5xl font-black drop-shadow-md ${isCriticalHp ? 'text-caos' : 'text-white'}`}>
                      {gameState.boss_hp}
                    </span>
                    <span className="text-xl text-slate-500 font-bold ml-1">/ {gameState.current_boss.max_hp}</span>
                  </div>
                </div>

                <div className="h-8 w-full bg-dark-950 rounded-xl overflow-hidden border-2 border-dark-900 shadow-inner p-1">
                  <div 
                    className={`h-full rounded-lg transition-all duration-500 ease-out relative overflow-hidden ${isCriticalHp ? 'bg-caos' : 'bg-brand-500'}`}
                    style={{ width: `${bossHpPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* INCIDENTE TEMÁTICO - Expande para preencher o resto */}
          <div className={`rounded-3xl transition-all duration-500 border-2 overflow-hidden flex-1 flex flex-col justify-center ${
              hasIncident ? incidentTheme.color : 'border-dashed border-dark-700 bg-dark-900/30'
            }`}
          >
            {hasIncident ? (
              <div className="relative p-6 h-full flex flex-col justify-center">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                  
                  <div className="flex flex-col items-center md:items-start flex-1 text-center md:text-left">
                    <div className="flex items-center gap-3 mb-2">
                      {incidentTheme.icon}
                      <h4 className={`${incidentTheme.text} font-black text-2xl tracking-widest uppercase drop-shadow-md`}>
                        {gameState.active_incident.title}
                      </h4>
                    </div>
                    <p className="text-slate-300 font-medium text-lg leading-relaxed max-w-2xl">
                      {gameState.active_incident.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[280px]">
                    <div className="bg-dark-950/80 backdrop-blur border border-dark-700 p-4 rounded-xl flex justify-between items-center shadow-lg">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Equipe Acionada</span>
                        <span className={`${incidentTheme.text} font-black text-xl uppercase`}>{gameState.active_incident.target_class}</span>
                      </div>
                      <Crosshair className={incidentTheme.text} size={24} opacity={0.5} />
                    </div>

                    <div className="bg-dark-950/80 backdrop-blur p-4 rounded-xl border border-dark-700 shadow-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Resoluções ({gameState.active_incident.current_resolutions}/{gameState.active_incident.required_resolutions})
                        </span>
                        <span className={`text-xl font-black drop-shadow-md ${incidentTheme.text}`}>
                          {Math.round(resolutionProgressPercent)}%
                        </span>
                      </div>
                      <div className="h-3 w-full bg-dark-900 rounded-full overflow-hidden border border-dark-800 shadow-inner">
                        <div 
                          className={`h-full transition-all duration-300 ease-out ${incidentTheme.text.replace('text-', 'bg-')}`}
                          style={{ width: `${resolutionProgressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-dark-950/80 backdrop-blur p-4 rounded-xl border border-dark-700 shadow-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full animate-ping ${hasIncident ? (incidentTheme.text.replace('text-', 'bg-')) : ''}`} />
                          Tempo Restante
                        </span>
                        <span className={`text-2xl font-black drop-shadow-md ${incidentTheme.text}`}>{gameState.incident_timer}s</span>
                      </div>
                      
                      <div className="h-3 w-full bg-dark-900 rounded-full overflow-hidden border border-dark-800 shadow-inner">
                        <div 
                          className={`h-full transition-all duration-1000 ease-linear relative ${hasIncident ? (incidentTheme.text.replace('text-', 'bg-')) : ''}`}
                          style={{ width: `${incidentTimerPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 opacity-60">
                {gameState.status === 'waiting' ? (
                  <>
                    <Activity className="text-slate-600 mb-3 animate-pulse" size={40} />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm mb-1">AGUARDANDO LIBERAÇÃO</p>
                    <p className="text-slate-500 font-mono text-xs">Os alunos podem logar, mas os ataques estão bloqueados.</p>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="text-slate-600 mb-3 animate-pulse-slow" size={40} />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm mb-1">Monitor de Infraestrutura Ativo</p>
                    <p className="text-slate-500 font-mono text-xs">Status: 200 OK. Sistema operando nominalmente.</p>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}