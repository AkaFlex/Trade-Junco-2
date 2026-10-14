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
      <div className="rainbow" />
      <div className="loading min-h-screen flex items-center justify-center">Carregando Junco Trade...</div>
    </ToastProvider>
  );

  const AREA_LABEL: Record<Flow, string> = {
    home: 'Menu principal', admin: 'Painel do gestor', login: 'Acesso restrito', request: 'Solicitar degustação',
    customization: 'Solicitar personalização', events: 'Solicitação de eventos', sellout: 'Sell-Out (degustadora)',
    reimbursement: 'Minhas solicitações',
  };

  const centeredCard = (children: React.ReactNode) => (
    <div className="page"><div className="card max-w-md mx-auto my-10 p-8 text-center view-in">{children}</div></div>
  );

  return (
    <ToastProvider>
      <ConfirmProvider>
      <div className="min-h-screen bg-paper flex flex-col">
        <div className="rainbow" />
        <header className="bg-white border-b border-line sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3 flex justify-between items-center gap-3">
            <button onClick={() => setFlow('home')} className="flex items-center gap-3 min-w-0 text-left" aria-label="Ir para o menu principal">
              <img src={juncoLogo} alt="" className="h-10 w-auto shrink-0" />
              <span className="min-w-0">
                <span className="block font-condensed font-black text-lg md:text-xl uppercase tracking-[.3px] text-navy leading-tight truncate">Junco Trade</span>
                <span className="block text-[12px] text-muted truncate">{AREA_LABEL[flow]}</span>
              </span>
            </button>

            <div className="flex items-center gap-2">
              {flow !== 'home' && (
                <button onClick={() => setFlow('home')} className="btn">
                  <Home size={15} /> <span className="hidden sm:inline">Início</span>
                </button>
              )}
              {user ? (
                <>
                  <span className="text-[13px] text-muted hidden md:inline">{user.email}</span>
                  <button onClick={handleLogout} className="btn"><LogOut size={15} /> <span className="hidden sm:inline">Sair</span></button>
                </>
              ) : (
                flow !== 'login' && (
                  <button onClick={() => setFlow('login')} className="btn"><Shield size={15} /> Gestor</button>
                )
              )}
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Suspense fallback={<div className="loading flex justify-center"><Loader2 className="animate-spin text-navy" size={32} /></div>}>
          {flow === 'home' && <HomeMenu user={user} onNavigate={setFlow} />}
          {flow === 'request' && <RequestWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'customization' && <CustomizationWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'events' && <EventsWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'sellout' && <PromoterPanel initialCode={parseHash().params.get('code') || undefined} />}
          {flow === 'reimbursement' && <RCAPanel user={user} />}
          {flow === 'admin' && user?.role === 'admin' && <AdminPanel />}
          {flow === 'admin' && user && user.role !== 'admin' && centeredCard(<>
            <Lock className="mx-auto text-muted mb-3" size={28} />
            <h2 className="section-title mb-2">Sem acesso ao painel</h2>
            <p className="text-[13.5px] text-muted mb-6">A conta <strong className="text-navy">{user.email}</strong> não tem perfil de gestor. Se precisar de acesso, fale com o responsável pelo Portal Trade.</p>
            <button onClick={() => setFlow('home')} className="btn-primary">Voltar ao início</button>
          </>)}
          {flow === 'admin' && !user && centeredCard(<>
            <Lock className="mx-auto text-muted mb-3" size={28} />
            <p className="text-[13.5px] text-muted mb-6">Entre com sua conta de gestor para acessar o painel.</p>
            <button onClick={() => setFlow('login')} className="btn-primary">Entrar</button>
          </>)}
          </Suspense>

          {flow === 'login' && (
            <div className="page">
              <div className="card max-w-md mx-auto my-10 view-in">
                <div className="card-head">
                  <h2 className="page-title text-xl flex items-center gap-2"><Shield size={20} /> Acesso restrito</h2>
                  <p className="page-sub">Apenas para gestores do Trade.</p>
                </div>
                <form onSubmit={handleLogin} className="p-5 space-y-4">
                  {loginError && <div className="notice-error" role="alert">{loginError}</div>}
                  <div>
                    <label htmlFor="login-email" className="label">E-mail corporativo</label>
                    <input id="login-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@junco.com.br" required autoComplete="username" />
                  </div>
                  <div>
                    <label htmlFor="login-pass" className="label">Senha</label>
                    <input id="login-pass" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
                  </div>
                  <button type="submit" disabled={loginLoading} className="btn-primary w-full btn-lg">
                    {loginLoading ? <><Loader2 size={16} className="animate-spin" /> Conectando...</> : 'Entrar no painel'}
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
