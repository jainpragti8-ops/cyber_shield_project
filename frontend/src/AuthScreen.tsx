import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, Shield, UserRound } from 'lucide-react';

const API = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api';

type User = { id:number; name:string; email:string };

export default function AuthScreen({ onAuthenticated, initialError }:{ onAuthenticated:(user:User)=>void; initialError?:string }) {
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? '');

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${API}/auth/${mode}`, {
        method:'POST',
        credentials:'include',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify(mode === 'signup' ? { name, email, password } : { email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? 'Unable to sign in. Please try again.');
      onAuthenticated(data.user);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not connect to the local service.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode:'login'|'signup') {
    setMode(nextMode);
    setError('');
  }

  return <main className="auth-page">
    <div className="auth-topline"><a className="auth-brand" href="#signin" aria-label="CyberShield home"><span><Shield size={19}/></span><b>CYBER<span>SHIELD</span><small>LOCAL THREAT DESK</small></b></a><div className="auth-local"><i/> LOCAL SYSTEM <span>·</span> PRIVATE WORKSPACE</div></div>
    <div className="auth-layout">
      <section className="auth-form-side" aria-labelledby="auth-title">
        <div className="auth-form-wrap">
          <div className="auth-kicker"><span className="auth-kicker-mark"><LockKeyhole size={13}/></span> SECURE ACCESS <span className="auth-kicker-line"/></div>
          <h1 id="auth-title">{mode==='login'?'Your security desk,':'Create your'}<br/><em>{mode==='login'?'ready when you are.':'private workspace.'}</em></h1>
          <p className="auth-intro">{mode==='login'?'Sign in to continue to your local threat analysis workspace.':'Set up a local account to keep your scan history private to you.'}</p>
          <div className="auth-switch" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'active':''} onClick={()=>switchMode('login')}>Sign in</button>
            <button type="button" role="tab" aria-selected={mode==='signup'} className={mode==='signup'?'active':''} onClick={()=>switchMode('signup')}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode==='signup'&&<label className="auth-field"><span>Your name</span><div className="auth-input-wrap"><UserRound size={17}/><input autoComplete="name" value={name} onChange={event=>setName(event.target.value)} minLength={2} maxLength={80} placeholder="Name for your workspace" required/></div></label>}
            <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><Mail size={17}/><input type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@example.com" maxLength={254} required/></div></label>
            <label className="auth-field"><span>Password</span><div className="auth-input-wrap"><LockKeyhole size={17}/><input aria-label="Password" type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={event=>setPassword(event.target.value)} placeholder={mode==='login'?'Enter your password':'At least 10 characters'} minLength={mode==='signup'?10:1} maxLength={128} required/><button className="password-visibility" type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>{mode==='signup'&&<small>Use at least 10 characters.</small>}</label>
            {mode==='signup'&&<label className="auth-field"><span>Confirm password</span><div className="auth-input-wrap"><Check size={17}/><input aria-label="Confirm password" type={showPassword?'text':'password'} autoComplete="new-password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} placeholder="Enter it once more" minLength={10} maxLength={128} required/></div></label>}
            {error&&<div className="auth-error" role="alert">{error}</div>}
            <button className="auth-submit" type="submit" disabled={busy}>{busy?'Securing your session…':mode==='login'?'Enter workspace':'Create local account'}<span><ArrowRight size={17}/></span></button>
          </form>
          <p className="auth-switch-copy">{mode==='login'?"New to CyberShield?":"Already have an account?"} <button type="button" onClick={()=>switchMode(mode==='login'?'signup':'login')}>{mode==='login'?'Create an account':'Sign in'}</button></p>
          <div className="auth-footnote"><LockKeyhole size={13}/> Passwords are protected with a one-way salted hash. Your scans stay local.</div>
        </div>
      </section>
      <aside className="auth-art" aria-label="CyberShield local protection status">
        <div className="auth-art-top"><span>CYBERSHIELD / ACCESS GATE</span><span>NODE 01 <i/></span></div>
        <div className="auth-signal-grid" aria-hidden="true"/>
        <div className="auth-shield-scene"><div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/><div className="auth-orbit orbit-three"/><div className="auth-scanline"/><div className="auth-shield"><Shield size={63} strokeWidth={1.2}/><span/></div><div className="auth-coord coord-a">LOCAL<br/>ENCRYPTION</div><div className="auth-coord coord-b">ACCESS<br/>CONTROL</div><div className="auth-crosshair cross-a"/><div className="auth-crosshair cross-b"/></div>
        <div className="auth-art-copy"><span className="eyebrow">A QUIETER KIND OF SECURITY</span><h2>Clarity at the<br/>edge of risk.</h2><p>Inspect what feels unusual. Understand the signals. Keep control of your data.</p></div>
        <div className="auth-status-strip"><div className="auth-status-icon"><Check size={15}/></div><div><b>Local analysis active</b><span>Inputs remain on this device</span></div><span className="auth-status-light"/></div>
        <div className="auth-art-foot"><span>PRIVATE BY DESIGN</span><span>NO EXTERNAL SCANNING</span><span>EDUCATIONAL TOOL</span></div>
      </aside>
    </div>
    <footer className="auth-footer"><span>CYBERSHIELD AI <i/> LOCAL SECURITY WORKSPACE</span><span>SCREENING IS NOT A GUARANTEE OF SAFETY</span></footer>
  </main>;
}