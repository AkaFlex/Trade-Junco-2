// Rotas por hash (#/sellout?code=TJ-...): funcionam no GitHub Pages sem 404.html,
// mantêm a tela no F5 e fazem o botão Voltar do navegador/Android navegar dentro do app.

export const FLOWS = ['home', 'request', 'sellout', 'reimbursement', 'admin', 'login', 'customization', 'events'] as const;
export type Flow = typeof FLOWS[number];

export const parseHash = (hash: string = window.location.hash): { flow: Flow; params: URLSearchParams } => {
  const [path, qs] = hash.replace(/^#\/?/, '').split('?');
  const flow = (FLOWS as readonly string[]).includes(path) ? (path as Flow) : 'home';
  return { flow, params: new URLSearchParams(qs || '') };
};

export const flowHash = (flow: Flow, params?: Record<string, string>) => {
  const qs = params ? new URLSearchParams(params).toString() : '';
  return `#/${flow === 'home' ? '' : flow}${qs ? `?${qs}` : ''}`;
};

/** Link completo para mandar à degustadora, já abrindo o Sell-Out com o código. */
export const selloutLink = (tradeCode: string) =>
  `${window.location.origin}${window.location.pathname}${flowHash('sellout', { code: tradeCode })}`;
