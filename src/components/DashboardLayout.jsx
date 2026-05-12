import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Swords, Settings, LogOut, TerminalSquare } from 'lucide-react';

export function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-dark-900 text-slate-200 overflow-hidden font-sans">
      
      {/* Sidebar Lateral */}
      <aside className="w-64 glass-card border-r-dark-700 flex flex-col z-10">
        
        {/* Branding */}
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center gap-3 mb-1">
            <TerminalSquare className="text-brand-500" size={28} />
            <h1 className="text-xl font-bold tracking-widest text-white">
              DUNGEON
            </h1>
          </div>
          <p className="text-xs text-brand-500 font-semibold tracking-wider uppercase ml-10">
            Master Console
          </p>
        </div>

        {/* Navegação */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Criar Instância" />
         <NavItem to="/" icon={<Swords size={20} />} label="Salas Ativas" />
          <NavItem to="/settings" icon={<Settings size={20} />} label="Configurações" />
        </nav>

        {/* Rodapé da Sidebar */}
        <div className="p-4 border-t border-dark-700">
          <button className="flex items-center gap-3 text-slate-400 hover:text-caos transition-colors w-full p-3 rounded-lg hover:bg-dark-700/50">
            <LogOut size={20} />
            <span className="font-medium text-sm">Desconectar</span>
          </button>
        </div>
      </aside>

      {/* Área Principal de Conteúdo */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Efeito de brilho de fundo opcional */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 z-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}

// Componente auxiliar para os itens do menu
function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-300
        ${isActive 
          ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20 shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]' 
          : 'text-slate-400 hover:bg-dark-700/50 hover:text-white'
        }
      `}
    >
      {icon}
      <span className="font-medium text-sm tracking-wide">{label}</span>
    </NavLink>
  );
}