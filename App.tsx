import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { PromoterPanel } from './components/PromoterPanel';
import { HomeMenu } from './components/HomeMenu';
import { Flow, parseHash, flowHash } from './utils/route';

// Carregados sob demanda: a home e o Sell-Out (uso no celular) não baixam o painel do gestor nem os gráficos.
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const RCAPanel = lazy(() => import('./components/RCAPanel').then(m => ({ default: m.RCAPanel })));
const RequestWizard = lazy(() => import('./components/RequestWizard').then(m => ({ default: m.RequestWizard })));
const CustomizationWizard = lazy(() => import('./components/CustomizationWizard').then(m => ({ default: m.CustomizationWizard })));
const EventsWizard = lazy(() => import('./components/EventsWizard').then(m => ({ default: m.EventsWizard })));
import { UserProfile, UserRole, ADMIN_EMAILS } from './types';
import { LogOut, Home, Shield, Loader2, Lock } from 'lucide-react';
import { ToastProvider } from './components/shared/Toast';
import { ConfirmProvider } from './components/shared/ConfirmModal';
import juncoLogo from './assets/junco-logo.png';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flow, setFlowState] = useState<Flow>(() => parseHash().flow);

  useEffect(() => {
    const onHash = () => setFlowState(parseHash().flow);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const setFlow = useCallback((next: Flow) => {
    const hash = flowHash(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    setFlowState(next);
    window.scrollTo(0, 0);
  }, []);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        let role: UserRole = 'rca';
        if (currentUser.email) {
          const userEmail = currentUser.email.toLowerCase();
          if (ADMIN_EMAILS.includes(userEmail)) role = 'admin';
        }
        setUser({
          uid: currentUser.uid,
          email: currentUser.email || '',
          role: role
        });
        if (flow === 'login') setFlow('home');
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [flow]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setFlow('home');
    } catch (err: any) {
      setLoginError("Email ou senha inválidos. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setFlow('home');
  };

  if (loading) return (
    <ToastProvider>
      <div className="min-h-screen flex items-center justify-center text-navy animate-pulse">Carregando Junco Trade...</div>
    </ToastProvider>
  );

  // Barra navy (padrão Junco) com uma faixa colorida que identifica a área atual.
  const FLOW_ACCENT: Record<Flow, string> = {
    home: '#AECB28', request: '#B91C1C', customization: '#5F4F9A', events: '#EE7C1F',
    sellout: '#D60052', reimbursement: '#1D8BD0', admin: '#59647A', login: '#59647A',
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
      <div className="min-h-screen bg-paper flex flex-col font-sans">
        
        {/* TOP NAVBAR */}
        <nav className="bg-navy text-white sticky top-0 z-50 border-b-4 transition-colors duration-500" style={{ borderBottomColor: FLOW_ACCENT[flow] }}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            
            <div className="flex items-center gap-3">
              <img
                src={juncoLogo}
                alt="Junco"
                className="h-9 w-auto shrink-0 cursor-pointer"
                onClick={() => setFlow('home')}
              />
              <div className="min-w-0 cursor-pointer" onClick={() => setFlow('home')}>
                <h1 className="font-condensed font-bold text-base md:text-lg leading-tight tracking-wide truncate">JUNCO TRADE</h1>
                <p className="text-[10px] opacity-80 uppercase tracking-widest truncate">
                  {flow === 'admin' ? 'Painel Gestor' : 
                   flow === 'login' ? 'Acesso Restrito' :
                   flow === 'request' ? 'Nova Solicitação' : 
                   flow === 'customization' ? 'Solicitar Personalização' :
                   flow === 'events' ? 'Solicitação de Eventos' :
                   flow === 'sellout' ? 'Sell Out (Degustadora)' :
                   flow === 'reimbursement' ? 'Acompanhar Solicitações' : 'Menu Principal'}
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
              
              {user ? (
                <>
                  <span className="text-sm hidden md:inline opacity-90">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 bg-black/20 px-3 py-1.5 rounded hover:bg-black/30 transition text-sm font-bold whitespace-nowrap"
                  >
                    <LogOut size={16} /> <span className="hidden sm:inline">Sair</span>
                  </button>
                </>
              ) : (
                flow !== 'login' && (
                  <button
                    onClick={() => setFlow('login')}
                    className="flex items-center gap-1 bg-white text-navy px-4 py-1.5 rounded hover:bg-paper transition text-sm font-condensed font-semibold uppercase tracking-wide whitespace-nowrap"
                  >
                    <Shield size={16} /> Gestor
                  </button>
                )
              )}
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-navy" size={36} /></div>}>
          {flow === 'home' && <HomeMenu user={user} onNavigate={setFlow} />}
          {flow === 'request' && <RequestWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'customization' && <CustomizationWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'events' && <EventsWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'sellout' && <PromoterPanel initialCode={parseHash().params.get('code') || undefined} />}
          {flow === 'reimbursement' && <RCAPanel user={user} />}
          {flow === 'admin' && user?.role === 'admin' && <AdminPanel />}
          {flow === 'admin' && user && user.role !== 'admin' && (
            <div className="max-w-md mx-auto my-16 bg-white border border-line rounded-md p-8 text-center">
              <Lock className="mx-auto text-muted mb-3" size={32} />
              <h2 className="font-condensed font-bold uppercase tracking-wide text-navy text-xl mb-2">Sem acesso ao painel</h2>
              <p className="text-sm text-muted mb-6">A conta <strong>{user.email}</strong> não tem perfil de gestor. Se precisar de acesso, fale com o responsável pelo Portal Trade.</p>
              <button onClick={() => setFlow('home')} className="bg-navy text-white px-5 py-2 rounded-md font-condensed font-semibold uppercase tracking-wide text-sm">Voltar ao início</button>
            </div>
          )}
          {flow === 'admin' && !user && (
            <div className="max-w-md mx-auto my-16 bg-white border border-line rounded-md p-8 text-center">
              <Lock className="mx-auto text-muted mb-3" size={32} />
              <p className="text-sm text-muted mb-6">Entre com sua conta de gestor para acessar o painel.</p>
              <button onClick={() => setFlow('login')} className="bg-navy text-white px-5 py-2 rounded-md font-condensed font-semibold uppercase tracking-wide text-sm">Entrar</button>
            </div>
          )}
          </Suspense>
          
          {flow === 'login' && (
            <div className="flex items-center justify-center p-4 h-full animate-in zoom-in-95 duration-300">
              <div className="bg-white border border-gray-100 p-8 rounded-md shadow-sm w-full max-w-md my-8">
                <div className="text-center mb-8">
                  <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-purple">
                    <Shield size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">Acesso Restrito</h2>
                  <p className="text-gray-500 text-sm mt-1">Apenas para gestores (Admins)</p>
                </div>
                
                {loginError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100 flex items-start gap-2">
                    <span className="font-bold flex-1">{loginError}</span>
                  </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">E-mail Corporativo</label>
                    <input 
                      type="email" 
                      className="w-full border border-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition bg-gray-50"
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
                      className="w-full border border-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition bg-gray-50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loginLoading}
                    className="w-full bg-brand-purple text-white font-bold py-3.5 rounded-md hover:bg-purple-900 transition-all shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                  >
                    {loginLoading ? "CONECTANDO..." : "ENTRAR NO PAINEL"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>

      </div>
      </ConfirmProvider>
    </ToastProvider>
  );
};

export default App;
