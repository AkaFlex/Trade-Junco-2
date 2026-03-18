
import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { AdminPanel } from './components/AdminPanel';
import { RCAPanel } from './components/RCAPanel';
import { PromoterPanel } from './components/PromoterPanel';
import { RequestWizard } from './components/RequestWizard';
import { HomeMenu } from './components/HomeMenu';
import { UserProfile, ADMIN_EMAILS } from './types';
import { LogOut, User, Shield, ArrowRight, Utensils, Home } from 'lucide-react';
import { ToastProvider } from './components/shared/Toast';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'landing' | 'login'>('landing');
  const [flow, setFlow] = useState<'home' | 'request' | 'sellout' | 'reimbursement' | 'admin'>('home');

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        let role: 'admin' | 'rca' | 'promoter' = 'rca';
        if (currentUser.email) {
          const userEmail = currentUser.email.toLowerCase();
          if (userEmail.includes('promotor') || userEmail.includes('degustacao')) role = 'promoter';
          if (ADMIN_EMAILS.includes(userEmail)) role = 'admin';
        }
        setUser({
          uid: currentUser.uid,
          email: currentUser.email || '',
          role: role
        });
        setFlow('home');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      setError("Email ou senha inválidos. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setViewMode('landing');
  };

  if (loading) return (
    <ToastProvider>
      <div className="min-h-screen flex items-center justify-center text-brand-red animate-pulse">Carregando Junco Trade...</div>
    </ToastProvider>
  );

  // 1. Authenticated / Active View
  if (user) {
    const isPromoterFlow = flow === 'sellout';
    const isManagerFlow = flow === 'admin';
    const bgColor = isManagerFlow ? 'bg-brand-purple' : isPromoterFlow ? 'bg-pink-600' : 'bg-brand-red';
    
    return (
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
          <nav className={`${bgColor} text-white shadow-lg sticky top-0 z-50 transition-colors duration-500`}>
            <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white p-1 rounded-md shrink-0 cursor-pointer" onClick={() => setFlow('home')}>
                  <div className={`w-6 h-6 rounded-full ${bgColor} transition-colors duration-500`}></div>
                </div>
                <div className="min-w-0 cursor-pointer" onClick={() => setFlow('home')}>
                  <h1 className="font-bold text-base md:text-lg leading-tight tracking-wide truncate">JUNCO TRADE</h1>
                  <p className="text-[10px] opacity-80 uppercase tracking-widest truncate">
                    {flow === 'admin' ? 'Painel Gestor' : 
                     flow === 'request' ? 'Nova Solicitação' : 
                     flow === 'sellout' ? 'Sell Out (Degustadora)' :
                     flow === 'reimbursement' ? 'Reembolso RCA' : 'Menu Principal'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                {flow !== 'home' && (
                  <button
                    onClick={() => setFlow('home')}
                    className="flex items-center gap-1 bg-black/10 px-3 py-1.5 rounded hover:bg-black/20 transition text-sm font-bold whitespace-nowrap"
                  >
                    <Home size={16} /> <span className="hidden sm:inline">Início</span>
                  </button>
                )}
                {user.email && <span className="text-sm hidden md:inline opacity-90">{user.email}</span>}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded hover:bg-black/30 transition text-sm font-bold whitespace-nowrap"
                >
                  <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            </div>
          </nav>

          <main className="flex-1 overflow-y-auto">
            {flow === 'home' && <HomeMenu user={user} onNavigate={setFlow} />}
            {flow === 'request' && <RequestWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
            {flow === 'sellout' && <PromoterPanel />}
            {flow === 'reimbursement' && <RCAPanel user={user} />}
            {flow === 'admin' && user.role === 'admin' && <AdminPanel />}
          </main>
        </div>
      </ToastProvider>
    );
  }

  // 2. Landing / Login Views (unchanged)
  return (
    <div className="min-h-screen font-sans flex flex-col bg-gray-50">
      <nav className="bg-brand-red text-white shadow-lg relative z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-md"><div className="w-6 h-6 rounded-full bg-brand-red"></div></div>
            <div>
              <h1 className="font-extrabold text-xl leading-none tracking-tight">JUNCO TRADE</h1>
              <span className="text-[10px] uppercase tracking-widest opacity-80 font-medium">Gestão Comercial</span>
            </div>
          </div>
          {viewMode === 'landing' && (
            <button 
              onClick={() => setViewMode('login')}
              className="bg-white text-brand-red px-5 py-2 rounded-lg font-bold hover:bg-gray-100 transition shadow-sm text-sm"
            >
              Fazer Login
            </button>
          )}
        </div>
      </nav>

      {viewMode === 'landing' && (
        <div className="flex-1 flex flex-col animate-in fade-in duration-500">
          <div className="bg-gradient-to-b from-brand-red to-red-900 text-white flex-1 flex items-center justify-center p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-black opacity-10 rounded-full blur-3xl -ml-20 -mb-20"></div>
            
            <div className="max-w-3xl mx-auto text-center relative z-10">
              <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">Painel de Ações <br className="hidden md:block"/> de Trade Marketing</h1>
              <p className="text-lg md:text-xl text-red-100 mb-10 max-w-2xl mx-auto font-medium">
                Plataforma unificada para solicitação de degustações, preenchimento de sell-out e envio de comprovantes de reembolso.
              </p>
              <button 
                onClick={() => setViewMode('login')}
                className="bg-white text-brand-red px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all shadow-xl hover:shadow-2xl flex items-center gap-2 mx-auto"
              >
                ACESSAR PLATAFORMA <ArrowRight size={20} />
              </button>
            </div>
          </div>

          <div className="bg-white py-16">
            <div className="max-w-5xl mx-auto px-8 grid md:grid-cols-3 gap-8 text-center text-gray-500">
              <div className="p-6">
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-red">
                  <User size={32}/>
                </div>
                <h3 className="text-gray-800 font-bold mb-2">RCAs (Vendedores)</h3>
                <p className="text-sm">Solicite degustações de forma ágil e faça o upload de notas e chave PIX para envio automático do reembolso.</p>
              </div>
              <div className="p-6">
                <div className="bg-pink-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-pink-600">
                  <Utensils size={32}/>
                </div>
                <h3 className="text-gray-800 font-bold mb-2">Degustadoras</h3>
                <p className="text-sm">Acesse sua pauta com o Código da Ação e preencha facilmente as vendas (sell-out) feitas nas lojas.</p>
              </div>
              <div className="p-6">
                <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-purple">
                  <Shield size={32}/>
                </div>
                <h3 className="text-gray-800 font-bold mb-2">Gestores</h3>
                <p className="text-sm">Controle orçamentos, aprove ou reprove pedidos instantaneamente e extraia métricas para exportação financeira fácil.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'login' && (
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-50 animate-in zoom-in-95 duration-300">
          <div className="bg-white border border-gray-100 p-8 rounded-2xl shadow-xl w-full max-w-md my-8">
            <div className="text-center mb-8">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-red">
                <Shield size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
              <p className="text-gray-500 text-sm mt-1">Insira suas credenciais corporativas</p>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100 flex items-start gap-2">
                <span className="font-bold flex-1">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">E-mail de Acesso</label>
                <input 
                  type="email" 
                  className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition bg-gray-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@junco.com.br"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Senha</label>
                <input 
                  type="password" 
                  className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red focus:border-transparent transition bg-gray-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <button 
                type="submit" 
                disabled={loginLoading}
                className="w-full bg-brand-red text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
              >
                {loginLoading ? "CONECTANDO..." : "ENTRAR"}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button 
                 onClick={() => setViewMode('landing')}
                 className="text-gray-400 hover:text-gray-800 text-sm font-medium transition"
              >
                ← Voltar para a página inicial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
