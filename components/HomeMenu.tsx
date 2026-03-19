
import React from 'react';
import { UserProfile } from '../types';
import { PlusCircle, ShoppingBag, DollarSign, ShieldAlert, ArrowRight, Star } from 'lucide-react';

interface Props {
  onNavigate: (flow: 'request' | 'sellout' | 'reimbursement' | 'admin' | 'customization') => void;
}

export const HomeMenu: React.FC<Props> = ({ user, onNavigate }) => {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
      
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-2">Bem-vindo(a) ao Junco Trade</h1>
        <p className="text-gray-500 text-lg">O que você deseja fazer hoje?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-12">
        {/* OPÇÃO 1 */}
        <button 
          onClick={() => onNavigate('request')}
          className="bg-white border-2 border-transparent hover:border-brand-red p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center text-center transform hover:-translate-y-2 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="bg-red-50 text-brand-red p-5 rounded-2xl mb-6 group-hover:bg-brand-red group-hover:text-white transition-colors relative z-10">
            <PlusCircle size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3 relative z-10">Solicitar Degustação</h2>
          <p className="text-gray-500 text-sm mb-6 relative z-10 flex-1">
            Crie uma nova solicitação de ação promocional para um parceiro.
          </p>
          <span className="text-brand-red font-bold text-sm flex items-center gap-2 relative z-10">
            INICIAR <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
          </span>
        </button>

        {/* OPÇÃO 2 */}
        <button 
          onClick={() => onNavigate('sellout')}
          className="bg-white border-2 border-transparent hover:border-pink-500 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center text-center transform hover:-translate-y-2 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="bg-pink-50 text-pink-600 p-5 rounded-2xl mb-6 group-hover:bg-pink-500 group-hover:text-white transition-colors relative z-10">
            <ShoppingBag size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3 relative z-10">Sell Out (Relatório)</h2>
          <p className="text-gray-500 text-sm mb-6 relative z-10 flex-1">
            Preencha as vendas diárias utilizando o Código Único da Ação.
          </p>
          <span className="text-pink-600 font-bold text-sm flex items-center gap-2 relative z-10">
            PREENCHER <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
          </span>
        </button>

        {/* OPÇÃO 3 */}
        <button 
          onClick={() => onNavigate('reimbursement')}
          className="bg-white border-2 border-transparent hover:border-purple-600 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center text-center transform hover:-translate-y-2 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="bg-purple-50 text-purple-600 p-5 rounded-2xl mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors relative z-10">
            <DollarSign size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3 relative z-10">Minhas Solicitações</h2>
          <p className="text-gray-500 text-sm mb-6 relative z-10 flex-1">
            Acompanhe suas solicitações e envie comprovantes de reembolso.
          </p>
          <span className="text-purple-600 font-bold text-sm flex items-center gap-2 relative z-10">
            ACESSAR PAINEL <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
          </span>
        </button>

        {/* OPÇÃO 4 */}
        <button 
          onClick={() => onNavigate('customization')}
          className="bg-white border-2 border-transparent hover:border-brand-purple p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col items-center text-center transform hover:-translate-y-2 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-purple/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
          <div className="bg-purple-50 text-brand-purple p-5 rounded-2xl mb-6 group-hover:bg-brand-purple group-hover:text-white transition-colors relative z-10">
            <Star size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-3 relative z-10">Solicitar Personalização</h2>
          <p className="text-gray-500 text-sm mb-6 relative z-10 flex-1">
            Novo espaço para gôndolas, fachada, etc com envio de foto e detalhes para a gráfica.
          </p>
          <span className="text-brand-purple font-bold text-sm flex items-center gap-2 relative z-10">
            PERSONALIZAR <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
          </span>
        </button>
      </div>

      {user?.role === 'admin' && (
        <div className="flex justify-center border-t border-gray-200 pt-8 mt-4">
          <button 
            onClick={() => onNavigate('admin')}
            className="flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-2xl hover:bg-black transition-all shadow-lg transform hover:-translate-y-1 font-bold"
          >
            <ShieldAlert size={20} className="text-brand-purple" />
            ACESSAR PAINEL GESTOR (ADMINISTRADOR)
          </button>
        </div>
      )}
    </div>
  );
};
