/** Local single-user boundary, shared by middleware and tests. Never trust forwarded-host. */
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);
export function assessRequest(request: Request, config: {user?:string; password?:string} = {}): {status:number; message:string} | null {
  let url: URL;
  try { url = new URL(request.url); } catch { return {status:400,message:'Ongeldige URL.'}; }
  const host = request.headers.get('host');
  // Next may use its internal bind address in request.url. Validate the original
  // Host authority, rather than treating that internal URL as the browser origin.
  if (host) {
    try {
      if (/[\\/@?#\s]/.test(host)) throw new Error('host');
      const incoming=new URL(`${url.protocol}//${host}`);
      if(incoming.host.toLowerCase()!==host.toLowerCase()) throw new Error('host');
      url=incoming;
    } catch {return {status:403,message:'Ongeldige host.'};}
  }
  const configured = Boolean(config.user && config.password);
  if ((config.user || config.password) && !configured) return {status:503,message:'Onvolledige toegangsconfiguratie.'};
  if (!LOCAL.has(url.hostname) && !configured) return {status:403,message:'Phoenix vereist lokale toegang of ingestelde authenticatie.'};
  if (configured) {
    let credentials='';
    const auth=request.headers.get('authorization') ?? '';
    try { if(auth.startsWith('Basic ')) credentials=atob(auth.slice(6)); } catch { /* reject */ }
    if (credentials !== `${config.user}:${config.password}`) return {status:401,message:'Aanmelden vereist.'};
  }
  if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
    const origin=request.headers.get('origin');
    const site=request.headers.get('sec-fetch-site');
    if (site === 'cross-site' || site === 'same-site' || origin && origin !== url.origin) return {status:403,message:'Aanvraag van een andere oorsprong geweigerd.'};
    // Browser requests carry Origin or Fetch Metadata. Headerless local CLI remains supported.
    if (site && site !== 'same-origin' && site !== 'none') return {status:403,message:'Onbekende aanvraagcontext.'};
  }
  return null;
}
