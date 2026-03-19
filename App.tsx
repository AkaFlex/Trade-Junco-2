import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { AdminPanel } from './components/AdminPanel';
import { RCAPanel } from './components/RCAPanel';
import { PromoterPanel } from './components/PromoterPanel';
import { RequestWizard } from './components/RequestWizard';
import { CustomizationWizard } from './components/CustomizationWizard';
import { HomeMenu } from './components/HomeMenu';
import { UserProfile, ADMIN_EMAILS } from './types';
import { LogOut, Home, Shield } from 'lucide-react';
import { ToastProvider, useToast } from './components/shared/Toast';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<'home' | 'request' | 'sellout' | 'reimbursement' | 'admin' | 'login' | 'customization'>('home');

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        let role: 'admin' | 'rca' | 'promoter' = 'rca';
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
      <div className="min-h-screen flex items-center justify-center text-brand-red animate-pulse">Carregando Junco Trade...</div>
    </ToastProvider>
  );

  const flowColors: Record<string, { bg: string, text: string }> = {
    admin: { bg: 'bg-gray-800', text: 'text-gray-800' },
    login: { bg: 'bg-gray-800', text: 'text-gray-800' },
    request: { bg: 'bg-brand-red', text: 'text-brand-red' },
    customization: { bg: 'bg-brand-purple', text: 'text-brand-purple' },
    sellout: { bg: 'bg-pink-600', text: 'text-pink-600' },
    reimbursement: { bg: 'bg-purple-600', text: 'text-purple-600' },
    home: { bg: 'bg-brand-red', text: 'text-brand-red' }
  };
  
  const bgColor = flowColors[flow]?.bg || 'bg-brand-red';
  const textColor = flowColors[flow]?.text || 'text-brand-red';

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        
        {/* TOP NAVBAR */}
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
                   flow === 'login' ? 'Acesso Restrito' :
                   flow === 'request' ? 'Nova Solicitação' : 
                   flow === 'customization' ? 'Solicitar Personalização' :
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
                    className={`flex items-center gap-1 bg-white ${textColor} px-4 py-1.5 rounded hover:bg-gray-100 transition text-sm font-bold shadow-sm whitespace-nowrap`}
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
          {flow === 'home' && <HomeMenu user={user} onNavigate={setFlow} />}
          {flow === 'request' && <RequestWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'customization' && <CustomizationWizard user={user} onCancel={() => setFlow('home')} onSuccess={() => setFlow('home')} />}
          {flow === 'sellout' && <PromoterPanel />}
          {flow === 'reimbursement' && <RCAPanel user={user} />}
          {flow === 'admin' && user?.role === 'admin' && <AdminPanel />}
          
          {flow === 'login' && (
            <div className="flex items-center justify-center p-4 h-full animate-in zoom-in-95 duration-300">
              <div className="bg-white border border-gray-100 p-8 rounded-2xl shadow-xl w-full max-w-md my-8">
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
                      className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition bg-gray-50"
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
                      className="w-full border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition bg-gray-50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={loginLoading}
                    className="w-full bg-brand-purple text-white font-bold py-3.5 rounded-xl hover:bg-purple-900 transition-all shadow-md transform hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                  >
                    {loginLoading ? "CONECTANDO..." : "ENTRAR NO PAINEL"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>

      </div>
    </ToastProvider>
  );
};

export default App;
