import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, Check, ChevronRight, CircleHelp, FileSearch, FileText, Gauge, History, Link2, LoaderCircle, LogOut, MessageSquareText, Search, Shield, ShieldAlert, ShieldCheck, Trash2, Upload } from 'lucide-react';
import AuthScreen from './AuthScreen';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api';
type ScanType = 'spam' | 'url' | 'file';
type Result = { verdict: string; risk_score: number; method: string; indicators: string[]; recommendations: string[]; confidence?: number; spam_probability?: number; hints?: string[]; file_name?: string; size?: number; sha256?: string; magic_type?: string; label?: string; id?: number };
type Stats = { total_scans: number; threats_detected: number; by_type: Record<string, number>; recent: { id:number; scan_type:string; input_summary:string; verdict:string; risk_score:number; created_at:string }[] };
type HistoryItem = { id:number; scan_type:ScanType; input_summary:string; verdict:string; risk_score:number; created_at:string };
type User = { id:number; name:string; email:string };
const names: Record<ScanType,string> = { spam:'Message check', url:'Link check', file:'File check' };

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${API}${path}`, { credentials:'include', ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail ?? 'Request failed.');
  return data;
}

export default function App() {
  const [authState, setAuthState] = useState<'checking'|'signed-out'|'signed-in'>('checking');
  const [authError, setAuthError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState('Overview');
  const [scanner, setScanner] = useState<ScanType>('spam');
  const [text, setText] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyType, setHistoryType] = useState('all');
  const [health, setHealth] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`${API}/auth/me`, { credentials:'include' })
      .then(async response => {
        if (response.status === 401) {
          if (active) setAuthState('signed-out');
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail ?? 'Unable to restore your local session.');
        if (active) {
          setUser(data.user);
          setAuthState('signed-in');
        }
      })
      .catch(reason => {
        if (active) {
          setAuthError(reason instanceof Error ? reason.message : 'Could not connect to the local service.');
          setAuthState('signed-out');
        }
      });
    return () => { active = false; };
  }, []);

  async function refresh() {
    try {
      const [nextStats, nextHistory, nextHealth, nextMetrics] = await Promise.all([request('/stats'), request('/history'), request('/health'), request('/model/metrics')]);
      setStats(nextStats); setHistory(nextHistory); setHealth(nextHealth); setMetrics(nextMetrics);
      setError('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Backend is unavailable.'); }
  }
  useEffect(() => { if (authState === 'signed-in') void refresh(); }, [authState]);

  async function runScan(file?: File) {
    setBusy(true); setError(''); setResult(null);
    try {
      let data: Result;
      if (scanner === 'file') {
        if (!file) throw new Error('Choose a file to analyze.');
        const form = new FormData(); form.append('file', file);
        data = await request('/scan/file', { method: 'POST', body: form });
      } else if (scanner === 'url') {
        data = await request('/scan/url', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ url:text }) });
      } else {
        data = await request('/scan/spam', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ message:text }) });
      }
      setResult(data); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not complete the scan.'); }
    finally { setBusy(false); }
  }

  async function clearHistory() {
    setError('');
    try {
      await request('/history', { method:'DELETE' });
      setResult(null);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not clear scan history.');
    }
  }

  async function signOut() {
    setError('');
    try {
      await request('/auth/logout', { method:'POST' });
      setUser(null); setStats(null); setHistory([]); setResult(null); setAuthState('signed-out');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not end the local session.');
    }
  }

  if (authState === 'checking') return <main className="auth-page" role="status">Restoring local session…</main>;
  if (authState === 'signed-out') return <AuthScreen initialError={authError} onAuthenticated={nextUser => { setAuthError(''); setUser(nextUser); setAuthState('signed-in'); }} />;

  const nav = [
    { label:'Overview', icon:Gauge }, { label:'Scanners', icon:Activity }, { label:'History', icon:History }, { label:'Evaluation', icon:FileText }, { label:'Awareness', icon:ShieldCheck },
  ];
  const filteredHistory = history.filter(row => {
    const matchesType = historyType === 'all' || row.scan_type === historyType;
    const searchableText = `${row.input_summary} ${row.verdict} ${names[row.scan_type as ScanType] ?? row.scan_type}`.toLowerCase();
    return matchesType && searchableText.includes(historyQuery.trim().toLowerCase());
  });
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Shield size={20}/></span><span>CYBER<span className="brand-light">SHIELD</span><small>LOCAL THREAT DESK</small></span></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{nav.map(item => <button key={item.label} title={item.label} aria-label={item.label} className={`nav-item ${page===item.label?'selected':''}`} onClick={()=>setPage(item.label)}><item.icon size={17}/>{item.label}{page===item.label&&<ChevronRight size={15} className="nav-chevron"/>}</button>)}</nav>
      <div className="side-bottom"><div className="privacy"><span className="live-dot"/><div><b>Local analysis</b><small>Inputs stay on this device</small></div><ShieldCheck size={17}/></div><div className="side-version">CYBERSHIELD AI <span>v1.0</span></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="crumb">SECURITY CONSOLE <span>/</span> {page.toUpperCase()}</div><div className="topbar-actions"><div className="backend-state"><span className={`live-dot ${health?.status!=='ok'?'offline':''}`}/>{health?.status==='ok'?'API connected':'Connecting to API'}</div><div className="account-chip"><span>{user?.name?.slice(0,1).toUpperCase()}</span><b>{user?.name}</b></div><button className="signout-button" onClick={()=>void signOut()} title="Sign out" aria-label="Sign out"><LogOut size={15}/></button></div></header>
      <div className="content">
        {error&&<div className="error-message" role="alert"><AlertTriangle size={16}/>{error}</div>}
        {page==='Overview'&&<>
          <section className="page-heading"><div><p className="eyebrow">LOCAL SECURITY WORKSPACE <span>•</span> 01</p><h1>Good security starts<br/>with a closer look.</h1><p className="subheading">Inspect messages, links and files. Every result includes the signals behind it.</p></div><div className="heading-stamp"><span>THREAT<br/>ANALYSIS</span><Shield size={34}/><small>OFFLINE FIRST</small></div></section>
          <section className="stat-row">
            <Stat label="SCANS RUN" value={stats?.total_scans ?? '—'} icon={<Activity size={17}/>} tone="mint"/>
            <Stat label="HIGH RISK" value={stats?.threats_detected ?? '—'} icon={<ShieldAlert size={17}/>} tone="red"/>
            <Stat label="MESSAGE" value={stats?.by_type?.spam ?? 0} icon={<MessageSquareText size={17}/>} tone="yellow"/>
            <Stat label="LINKS / FILES" value={`${stats?.by_type?.url ?? 0} / ${stats?.by_type?.file ?? 0}`} icon={<FileSearch size={17}/>} tone="blue"/>
          </section>
          <div className="section-title"><h2>Choose an inspection</h2><span>THREE ANALYSIS METHODS</span></div>
          <section className="scanner-grid">
            <ScannerCard icon={<MessageSquareText/>} index="01" title="Message" subtitle="Spam and social engineering" method="TF-IDF + LOGISTIC REGRESSION" color="mint" onClick={()=>{setScanner('spam');setPage('Scanners');setResult(null)}}/>
            <ScannerCard icon={<Link2/>} index="02" title="Link" subtitle="Suspicious URL heuristics" method="RULE-BASED ANALYSIS" color="yellow" onClick={()=>{setScanner('url');setPage('Scanners');setResult(null)}}/>
            <ScannerCard icon={<FileSearch/>} index="03" title="File" subtitle="Metadata and signature checks" method="METADATA ONLY" color="red" onClick={()=>{setScanner('file');setPage('Scanners');setResult(null)}}/>
          </section>
          <section className="lower-grid"><div className="panel recent-panel"><div className="panel-heading"><div><span className="eyebrow">ACTIVITY FEED</span><h2>Recent inspections</h2></div><button className="text-button" onClick={()=>setPage('History')}>View history <ArrowUpRight size={15}/></button></div>{stats?.recent?.length ? stats.recent.slice(0,4).map(item=><Recent key={item.id} item={item}/>) : <div className="empty-inline">Your completed inspections will appear here.</div>}</div><div className="panel method-panel"><span className="eyebrow">BUILT FOR TRANSPARENCY</span><h2>Different threats,<br/>different signals.</h2><p>Spam uses a trained model. Links use visible heuristics. Files are examined as bytes and are never run.</p><div className="method-footer"><span><ShieldCheck size={16}/> NO LIVE URL FETCHING</span><span><ShieldCheck size={16}/> NO FILE EXECUTION</span></div></div></section>
        </>}
        {page==='Scanners'&&<>
          <section className="compact-heading"><p className="eyebrow">ANALYSIS WORKBENCH <span>•</span> 02</p><h1>Inspect an input.</h1><p className="subheading">Choose a method; the result will show what it can and cannot tell you.</p></section>
          <div className="scanner-tabs">{(['spam','url','file'] as ScanType[]).map(type=><button className={scanner===type?'active':''} key={type} onClick={()=>{setScanner(type);setResult(null);setError('')}}>{type==='spam'?<MessageSquareText size={16}/>:type==='url'?<Link2 size={16}/>:<FileSearch size={16}/>} {names[type]}</button>)}</div>
          <section className="workbench"><div className="input-pane"><div className="pane-heading"><div><span className="eyebrow">{scanner==='spam'?'MACHINE LEARNING':scanner==='url'?'TRANSPARENT HEURISTICS':'BYTE-LEVEL METADATA'}</span><h2>{scanner==='spam'?'Message inspection':scanner==='url'?'Link inspection':'File inspection'}</h2></div><CircleHelp size={17}/></div>
            {scanner==='file'?<label className="drop-zone"><Upload size={25}/><b>Choose a file to inspect</b><span>Maximum size 10 MB. File contents are never stored.</span><input type="file" onChange={event=>{const file=event.target.files?.[0];if(file)void runScan(file)}}/></label>:<><label className="input-label" htmlFor="scan-input">{scanner==='spam'?'MESSAGE TEXT':'URL'}</label><textarea id="scan-input" value={text} onChange={event=>setText(event.target.value)} maxLength={scanner==='spam'?2000:2048} placeholder={scanner==='spam'?'Paste a message for analysis…':'https://example.com/path'} rows={8}/><div className="input-meta"><span>{text.length} / {scanner==='spam'?'2,000':'2,048'}</span><button className="sample-button" onClick={()=>setText(scanner==='spam'?'Congratulations! You have won a prize. Claim now at http://example.invalid':'http://192.168.1.5/login@verify-account.example')}>LOAD SAMPLE</button></div><button className="run-button" onClick={()=>void runScan()} disabled={busy||!text.trim()}>{busy?<LoaderCircle className="spin" size={17}/>:<Activity size={17}/>} {busy?'Analyzing…':'Run inspection'} <ArrowUpRight size={16}/></button></>}
            {scanner==='spam'&&health&&!health.spam_model_ready&&<div className="notice"><AlertTriangle size={16}/><span>Spam model is not trained yet. URL and file inspection remain available. Add the dataset and run the training script to enable this scanner.</span></div>}
          </div><div className="result-pane"><div className="pane-heading"><div><span className="eyebrow">ANALYSIS REPORT</span><h2>Inspection result</h2></div><FileText size={17}/></div>{result?<ResultView result={result}/>:<div className="result-empty"><div className="target-ring"><Shield size={27}/></div><b>Waiting for input</b><span>Your analysis will appear here with a verdict, score and reasons.</span><div className="empty-rule"/><small>NO CLAIM OF COMPLETE SAFETY</small></div>}</div></section>
          <p className="caveat"><ShieldAlert size={15}/> CyberShield is an educational screening tool. A low-risk result is not proof that content is safe.</p>
        </>}
        {page==='History'&&<>
          <section className="compact-heading history-heading"><p className="eyebrow">LOCAL RECORD <span>•</span> 03</p><h1>Inspection history.</h1><p className="subheading">Recent scans stored locally on this device.</p><button className="clear-button" onClick={()=>void clearHistory()} disabled={!history.length}><Trash2 size={15}/> Clear history</button></section>
          <section className="panel history-table">
            <div className="history-controls">
              <label className="history-search"><Search size={16}/><input aria-label="Search scan history" value={historyQuery} onChange={event=>setHistoryQuery(event.target.value)} placeholder="Search scans or verdicts"/></label>
              <label className="history-filter-label"><span>Filter type</span><select aria-label="Filter history by scan type" value={historyType} onChange={event=>setHistoryType(event.target.value)}><option value="all">All scans</option><option value="spam">Messages</option><option value="url">Links</option><option value="file">Files</option></select></label>
            </div>
            <div className="table-head"><span>TYPE / INPUT</span><span>VERDICT</span><span>SCORE</span><span>WHEN</span></div>
            {filteredHistory.length?filteredHistory.map(row=><Recent key={row.id} item={{id:row.id,scan_type:row.scan_type,input_summary:row.input_summary,verdict:row.verdict,risk_score:row.risk_score,created_at:row.created_at}}/>):<div className="history-empty"><History size={25}/><b>{history.length?'No matching scans':'No inspections yet'}</b><span>{history.length?'Try a different search or scan type filter.':'Run a scanner to start a local activity record.'}</span></div>}
          </section>
        </>}
        {page==='Evaluation'&&<>
          <section className="compact-heading"><p className="eyebrow">MODEL CARD <span>•</span> 04</p><h1>Measure the model.</h1><p className="subheading">Held-out evaluation of the trained SMS spam classifier.</p></section>
          {metrics?.available?<><section className="metric-grid">{[['ACCURACY',metrics.accuracy],['PRECISION',metrics.precision],['RECALL',metrics.recall],['F1 SCORE',metrics.f1]].map(([label,value])=><div className="metric" key={String(label)}><span>{label}</span><b>{(Number(value)*100).toFixed(2)}<small>%</small></b></div>)}</section><section className="evaluation-grid"><div className="panel"><span className="eyebrow">TEST DATA</span><h2>Evaluation setup</h2><div className="data-line"><span>Dataset size</span><b>{metrics.dataset_size?.toLocaleString()} messages</b></div><div className="data-line"><span>Train / test</span><b>{metrics.train_size?.toLocaleString()} / {metrics.test_size?.toLocaleString()}</b></div><div className="data-line"><span>Split</span><b>{metrics.split}</b></div><p className="limitations">{metrics.limitations}</p></div><div className="panel"><span className="eyebrow">CONFUSION MATRIX</span><h2>Actual × predicted</h2><div className="matrix-labels"><span></span><span>HAM</span><span>SPAM</span></div><div className="matrix-row"><b>HAM</b>{metrics.confusion_matrix?.[0]?.map((value:number,index:number)=><strong key={index}>{value}</strong>)}</div><div className="matrix-row"><b>SPAM</b>{metrics.confusion_matrix?.[1]?.map((value:number,index:number)=><strong key={index}>{value}</strong>)}</div><small className="matrix-caption">Rows: actual class. Columns: predicted class.</small></div></section></>:<div className="panel"><h2>Metrics are not available</h2><p className="subheading">Train the spam model to generate the held-out evaluation report.</p></div>}
        </>}
        {page==='Awareness'&&<>
          <section className="compact-heading"><p className="eyebrow">SECURITY FIELD NOTES <span>•</span> 05</p><h1>Pause. Verify. Protect.</h1><p className="subheading">A few habits that reduce the chance of falling for common attacks.</p></section>
          <section className="tips-grid">{[{n:'01',title:'Treat urgency as a signal',text:'Unexpected pressure to act, pay, or reveal a code is a reason to slow down. Contact the organization through a known channel.'},{n:'02',title:'Inspect the real destination',text:'Read the complete domain before opening a link. A familiar brand name in a subdomain or path does not prove the destination belongs to that brand.'},{n:'03',title:'Keep credentials out of links',text:'Do not enter passwords, payment details, or one-time codes after following an unsolicited message link. Navigate independently instead.'},{n:'04',title:'Do not run unexpected files',text:'Confirm who sent a file and why you expected it. File names and icons can be misleading; metadata checks cannot prove a file is benign.'},{n:'05',title:'Report suspicious messages',text:'Use your mail or messaging service’s reporting tools. Avoid replying, forwarding, or clicking links in messages you distrust.'},{n:'06',title:'Use layered protection',text:'Keep your operating system and security software updated. This educational scanner is not a replacement for antivirus or incident response.'}].map(tip=><article className="tip" key={tip.n}><span>{tip.n}</span><div><h2>{tip.title}</h2><p>{tip.text}</p></div><ArrowUpRight size={16}/></article>)}</section>
        </>}
      </div>
      <footer className="footer"><span>CYBERSHIELD AI <i/> LOCAL BY DESIGN</span><span>SCREENING IS NOT A GUARANTEE OF SAFETY</span></footer>
    </main>
  </div>;
}

function Stat({label,value,icon,tone}:{label:string;value:string|number;icon:React.ReactNode;tone:string}) { return <div className="stat"><div className={`stat-icon ${tone}`}>{icon}</div><span className="stat-label">{label}</span><strong>{value}</strong><span className="stat-foot">LOCAL RECORD</span></div> }
function ScannerCard({icon,index,title,subtitle,method,color,onClick}:{icon:React.ReactNode;index:string;title:string;subtitle:string;method:string;color:string;onClick:()=>void}) {return <button className={`scanner-card ${color}`} onClick={onClick}><div className="card-top"><span className="card-icon">{icon}</span><span className="card-index">{index} / 03</span></div><div><h3>{title} <ArrowUpRight size={17}/></h3><p>{subtitle}</p></div><div className="card-method">{method}</div></button>}
function Recent({item}:{item:{id:number;scan_type:string;input_summary:string;verdict:string;risk_score:number;created_at:string}}) {const icon=item.scan_type==='spam'?<MessageSquareText/>:item.scan_type==='url'?<Link2/>:<FileSearch/>;return <div className="recent-row"><span className="recent-icon">{icon}</span><div className="recent-name"><b>{names[item.scan_type as ScanType]??item.scan_type}</b><span>{item.input_summary}</span></div><span className={`verdict-tag ${item.risk_score>=60?'danger':item.risk_score>=30?'warning':'good'}`}>{item.verdict}</span><span className="recent-score">{item.risk_score}<small>/100</small></span><time>{new Date(item.created_at).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div>}
function ResultView({result}:{result:Result}) {const risky=result.risk_score>=60;return <div className="result-content"><div className={`result-verdict ${risky?'danger':result.risk_score>=30?'warning':'good'}`}><span>{risky?<ShieldAlert size={22}/>:result.risk_score>=30?<AlertTriangle size={22}/>:<ShieldCheck size={22}/>}</span><div><small>VERDICT</small><b>{result.verdict}</b></div><strong>{result.risk_score}<small>/100</small></strong></div><div className="score-track"><span style={{width:`${result.risk_score}%`}}/></div><div className="method-badge">METHOD <b>{result.method.toUpperCase()}</b></div>{result.confidence!==undefined&&<div className="data-line"><span>Model confidence</span><b>{(result.confidence*100).toFixed(1)}%</b></div>}{result.spam_probability!==undefined&&<div className="data-line"><span>Spam probability</span><b>{(result.spam_probability*100).toFixed(1)}%</b></div>}{result.file_name&&<><div className="data-line"><span>File</span><b>{result.file_name}</b></div><div className="data-line"><span>Size · signature</span><b>{result.size} bytes · {result.magic_type}</b></div><div className="hash-line"><span>SHA-256</span><code>{result.sha256}</code></div></>}<div className="report-block"><h3>Signals <span>{result.indicators.length}</span></h3>{result.indicators.length?result.indicators.map((item,index)=><div className="signal" key={index}><AlertTriangle size={14}/>{item}</div>):<div className="signal clean"><Check size={14}/>No configured indicators triggered.</div>}{result.hints?.map((hint,index)=><div className="signal hint" key={`hint-${index}`}><CircleHelp size={14}/>{hint} <b>HINT</b></div>)}</div><div className="report-block"><h3>Recommendation</h3>{result.recommendations.map((item,index)=><div className="recommendation" key={index}><ShieldCheck size={14}/>{item}</div>)}</div><div className="result-disclaimer">{result.label??'Screening is heuristic or model-based and cannot guarantee safety.'}</div></div>}