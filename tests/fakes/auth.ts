// Autenticação falsa para os testes: aceita só a senha de teste abaixo; nada sai do navegador.
export const FAKE_PASSWORD = 'senha-de-teste';
const KEY = '__fake_user__';
const listeners = new Set<(u: any) => void>();
const read = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; } };
const authObj: any = { currentUser: read() };
export const getAuth = () => authObj;
const emit = () => listeners.forEach(l => l(authObj.currentUser));
export const onAuthStateChanged = (_a: any, cb: (u: any) => void) => { listeners.add(cb); setTimeout(() => cb(authObj.currentUser), 0); return () => listeners.delete(cb); };
export const signInWithEmailAndPassword = async (_a: any, email: string, pw: string) => {
  if (pw !== FAKE_PASSWORD) throw new Error('auth/invalid-credential');
  authObj.currentUser = { uid: 'u-teste', email: email.toLowerCase() };
  sessionStorage.setItem(KEY, JSON.stringify(authObj.currentUser)); emit();
  return { user: authObj.currentUser };
};
export const signOut = async () => { authObj.currentUser = null; sessionStorage.removeItem(KEY); emit(); };
