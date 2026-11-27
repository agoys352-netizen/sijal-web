import { useEffect, useMemo, useState } from 'react'
import { Activity, ClipboardList, ChevronRight, LogOut, Map, MapPin, Plus, Users, Settings, Menu, Search, Lock, AlertCircle, Check, ArrowRight, CalendarDays, LoaderCircle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import MapWorkspace from './MapWorkspace'

type SessionRow = {
  id: string; session_code: string; creator_id: string; creator_name: string; survey_type: string;
  study_area: string; survey_date: string; weather: string | null; segments_list: string[]; is_locked: boolean;
  created_at: string; my_role?: string; points_count?: number
}
const navItems = [{label:'Sesi Survei',icon:ClipboardList},{label:'Peta Inventaris',icon:Map},{label:'Tim Surveyor',icon:Users},{label:'Pengaturan',icon:Settings}]
const weatherOptions=['Cerah','Berawan','Mendung','Gerimis','Hujan']
const today=()=>new Date().toISOString().slice(0,10)
const logoUrl=`${import.meta.env.BASE_URL}sijal-logo.svg`
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase()

export default function App(){
  const [active,setActive]=useState('Sesi Survei'),[menuOpen,setMenuOpen]=useState(false)
  const [user,setUser]=useState<any>(null),[authMode,setAuthMode]=useState<'login'|'signup'>('login')
  const [authName,setAuthName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('')
  const [authBusy,setAuthBusy]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [sessions,setSessions]=useState<SessionRow[]>([]),[createOpen,setCreateOpen]=useState(false),[joinOpen,setJoinOpen]=useState(false)
  const [surveyType,setSurveyType]=useState('RUAS'),[studyArea,setStudyArea]=useState(''),[surveyDate,setSurveyDate]=useState(today()),[weather,setWeather]=useState('Cerah'),[weatherNote,setWeatherNote]=useState('')
  const [segments,setSegments]=useState(''),[joinCode,setJoinCode]=useState('')
  const [search,setSearch]=useState(''),[selectedSession,setSelectedSession]=useState<SessionRow|null>(null)

  useEffect(()=>{ if(!supabase)return; supabase.auth.getSession().then(({data})=>setUser(data.session?.user??null)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));return()=>subscription.unsubscribe()},[])
  useEffect(()=>{if(user)loadSessions()},[user])
  async function loadSessions(){
    if(!supabase||!user)return
    setBusy(true);setError('')
    try{
      const {data:members,error:memberErr}=await supabase.from('session_members').select('session_id,role').eq('user_id',user.id)
      if(memberErr)throw memberErr
      const ids=(members??[]).map(m=>m.session_id)
      if(!ids.length){setSessions([]);return}
      const {data:rows,error:sessionErr}=await supabase.from('survey_sessions').select('*').in('id',ids).order('created_at',{ascending:false})
      if(sessionErr)throw sessionErr
      const {data:points}=await supabase.from('survey_points').select('session_id').in('session_id',ids)
      setSessions((rows??[]).map(s=>({...s,my_role:members?.find(m=>m.session_id===s.id)?.role,points_count:points?.filter(p=>p.session_id===s.id).length??0})))
    }catch(e:any){setError(e.message??'Gagal mengambil sesi')}finally{setBusy(false)}
  }
  async function submitAuth(e:React.FormEvent){
    e.preventDefault();if(!supabase)return;setAuthBusy(true);setError('');setNotice('')
    try{
      if(authMode==='signup'){
        const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:authName.trim()}}});if(error)throw error
        if(!data.session)setNotice('Pendaftaran berhasil. Periksa email untuk verifikasi, lalu masuk.')
        else setNotice('Akun berhasil dibuat.')
      }else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error}
    }catch(e:any){setError(e.message??'Autentikasi gagal')}finally{setAuthBusy(false)}
  }
  async function signOut(){await supabase?.auth.signOut();setUser(null);setSessions([]);setActive('Sesi Survei')}
  async function copySessionCode(sessionCode:string){try{await navigator.clipboard.writeText(sessionCode);setNotice('Kode sesi '+sessionCode+' berhasil disalin. Bagikan kepada anggota surveyor.')}catch{setNotice('Kode sesi: '+sessionCode+' (silakan salin secara manual)')}}
  async function createSession(e:React.FormEvent){
    e.preventDefault();if(!supabase||!user)return
    setBusy(true);setError('')
    const fullName=user.user_metadata?.full_name||user.email||'Surveyor'
    const segs=segments.split(/[,\n]/).map(s=>s.trim()).filter(Boolean)
    if(!studyArea.trim()||!segs.length){setError('Lokasi kajian dan minimal satu ruas/lengan wajib diisi.');setBusy(false);return}
    const sessionCode=code()
    try{
      const {data:session,error:insertErr}=await supabase.from('survey_sessions').insert({session_code:sessionCode,creator_id:user.id,creator_name:fullName,survey_type:surveyType,study_area:studyArea.trim(),survey_date:surveyDate,weather:weatherNote.trim()?weather+' — '+weatherNote.trim():weather,segments_list:segs,is_locked:false}).select().single()
      if(insertErr)throw insertErr
      const {error:memberErr}=await supabase.from('session_members').insert({session_id:session.id,user_id:user.id,member_name:fullName,role:'LEADER'})
      if(memberErr)throw memberErr
      setCreateOpen(false);setNotice('Sesi dibuat! Kode sesi: '+sessionCode);setStudyArea('');setSegments('');await loadSessions()
    }catch(e:any){setError(e.message??'Gagal membuat sesi')}finally{setBusy(false)}
  }
  async function joinSession(e:React.FormEvent){
    e.preventDefault();if(!supabase||!user)return
    const normalizedCode=joinCode.trim().toUpperCase()
    if(normalizedCode.length<6){setError('Masukkan kode sesi minimal 6 karakter.');return}
    setBusy(true);setError('');setNotice('')
    try{
      const {data,error:joinErr}=await supabase.rpc('join_survey_session_by_code',{p_code:normalizedCode,p_member_name:user.user_metadata?.full_name||user.email||'Surveyor'})
      if(joinErr)throw joinErr
      const result=data as {status:'joined'|'already_member';session:SessionRow}
      const joinedSession=result?.session
      if(!joinedSession)throw new Error('Respons bergabung tidak valid. Silakan coba kembali.')
      setJoinOpen(false);setJoinCode('')
      setNotice(result.status==='already_member'?'Anda sudah menjadi anggota sesi '+joinedSession.session_code+'.':'Berhasil bergabung ke sesi '+joinedSession.session_code+' — '+joinedSession.study_area+'.')
      await loadSessions()
    }catch(e:any){setError(e.message??'Gagal bergabung ke sesi')}finally{setBusy(false)}
  }
  const visibleSessions=useMemo(()=>sessions.filter(s=>(s.study_area+' '+s.session_code+' '+s.survey_type).toLowerCase().includes(search.toLowerCase())),[sessions,search])
  if(!isSupabaseConfigured)return <div className="config-screen"><div className="config-card"><div className="brand-mark"><img src={logoUrl} alt="Logo SIJAL"/></div><h1>SIJAL</h1><h2>Konfigurasi Supabase diperlukan</h2><p>Frontend sudah siap, tetapi environment Supabase belum disetel pada build GitHub Pages.</p><div className="config-steps"><b>Tambahkan secrets repository GitHub:</b><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code><p>Settings → Secrets and variables → Actions. Setelah secret ditambahkan, jalankan ulang workflow deployment.</p></div><a href="https://github.com/agoys352-netizen/sijal-web/settings/secrets/actions">Buka GitHub Actions secrets</a></div></div>
  if(!user)return <div className="auth-screen"><div className="auth-brand"><div className="brand-mark"><MapPin/></div><div><b>SIJAL</b><small>SISTEM INVENTARISASI JALAN</small></div></div><div className="auth-card"><div className="auth-heading"><h1>{authMode==='login'?'Selamat datang kembali':'Buat akun surveyor'}</h1><p>{authMode==='login'?'Masuk ke workspace survei Anda.':'Daftar akun untuk mulai membuat dan bergabung sesi.'}</p></div><form onSubmit={submitAuth} className="form-stack">{authMode==='signup'&&<label>Nama lengkap<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Nama surveyor"/></label>}<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email"/></label><label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete={authMode==='login'?'current-password':'new-password'}/></label><button className="primary-button full" disabled={authBusy}>{authBusy?<LoaderCircle className="spin"/>:null}{authMode==='login'?'Masuk':'Daftar akun'}</button></form>{error&&<div className="alert error"><AlertCircle size={17}/>{error}</div>}{notice&&<div className="alert success">{notice}</div>}<div className="auth-switch">{authMode==='login'?'Belum punya akun?':'Sudah memiliki akun?'} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setError('')}}>{authMode==='login'?'Daftar':'Masuk'}</button></div><div className="auth-foot"><Lock size={14}/> Akun personal · Data sesi berbasis hak akses</div></div><p className="auth-copyright">SIJAL Web · Sistem Inventarisasi Jalan</p></div>
  return <div className="app-shell"><aside className={menuOpen?'sidebar open':'sidebar'}><div className="brand"><div className="brand-mark"><img src={logoUrl} alt="Logo SIJAL"/></div><div><b>SIJAL</b><small>SISTEM INVENTARISASI JALAN</small></div></div><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(({label,icon:Icon})=><button key={label} className={active===label?'nav-item selected':'nav-item'} onClick={()=>{setActive(label);setMenuOpen(false)}}><Icon size={18}/><span>{label}</span>{active===label&&<ChevronRight size={16} className="nav-chevron"/>}</button>)}</nav><div className="sidebar-bottom"><div className="user-card"><div className="avatar">{(user.user_metadata?.full_name||user.email||'S').charAt(0).toUpperCase()}</div><div className="user-details"><b>{user.user_metadata?.full_name||'Surveyor'}</b><small>{user.email}</small></div><button title="Keluar" className="icon-button logout" onClick={signOut}><LogOut size={17}/></button></div><div className="version">SIJAL Web · v0.2.0</div></div></aside>
  <main className="main"><header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{active}</b></div><div className="top-actions"><button className="icon-button" title="Refresh sesi" onClick={loadSessions}><Activity size={18}/></button><div className="avatar small">{(user.user_metadata?.full_name||'S').charAt(0).toUpperCase()}</div></div></header><div className="content"><div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase()}</div><h1>{active}</h1><p>{active==='Sesi Survei'?'Kelola sesi inventarisasi perlengkapan jalan, gabung tim, dan buka survei lapangan.':'Workspace survei terhubung ke database Supabase.'}</p></div><div className="welcome-actions"><button className="secondary-button" onClick={()=>{setJoinOpen(true);setError('')}}><Users size={17}/> Gabung sesi</button><button className="primary-button" onClick={()=>{setCreateOpen(true);setError('')}}><Plus size={18}/> Buat sesi survei</button></div></div>
  {notice&&<div className="alert success notice"><Check size={18}/>{notice}<button onClick={()=>setNotice('')}>×</button></div>}{error&&<div className="alert error notice"><AlertCircle size={17}/>{error}<button onClick={()=>setError('')}>×</button></div>}
  {active==='Peta Inventaris'&&<section className="section map-session-picker"><div className="section-head"><div><h2>Pilih sesi untuk pemetaan</h2><p>Buka workspace peta dan input titik inventaris</p></div></div>{selectedSession?<MapWorkspace session={selectedSession} userId={user.id} userName={user.user_metadata?.full_name||user.email||'Surveyor'} onBack={()=>setSelectedSession(null)}/>:<div className="session-list">{sessions.map(s=><article className="session-card" key={s.id}><div className="session-icon"><Map size={20}/></div><div className="session-info"><h3>{s.study_area}</h3><p>{s.session_code} · {s.survey_type==='RUAS'?'Survei Ruas':'Survei Simpang'}</p><div className="session-meta"><span><MapPin size={14}/>{s.points_count||0} titik</span><span>{s.is_locked?'Terkunci':'Aktif'}</span></div></div><button className="primary-button" onClick={()=>setSelectedSession(s)}>Buka peta</button></article>)}</div>}</section>}{active==='Sesi Survei'&&<section className="section"><div className="section-head"><div><h2>Semua sesi survei</h2><p>Sesi tersimpan di cloud dan dapat diakses anggota tim</p></div></div><div className="session-tools"><div className="search-box"><Search size={17}/><input placeholder="Cari lokasi atau kode sesi" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="secondary-button" onClick={()=>{setJoinOpen(true);setError('')}}><Users size={17}/> Gabung sesi</button></div>{busy&&<div className="loading"><LoaderCircle className="spin"/> Memuat data…</div>}{visibleSessions.length===0&&!busy?<div className="empty-state"><ClipboardList size={28}/><b>Belum ada sesi survei</b><p>Buat sesi baru atau bergabung menggunakan kode sesi dari ketua tim.</p><div><button className="primary-button" onClick={()=>setCreateOpen(true)}><Plus size={17}/> Buat sesi</button><button className="secondary-button" onClick={()=>setJoinOpen(true)}>Gabung dengan kode</button></div></div>:<div className="session-list">{visibleSessions.map(s=><article className="session-card" key={s.id}><div className="session-icon"><ClipboardList size={20}/></div><div className="session-info"><h3>{s.study_area}</h3><p>{s.survey_type==='RUAS'?'Survei Ruas Jalan':'Survei Simpang'} · <b className="session-code-inline">{s.session_code}</b> <button type="button" className="copy-code-button" onClick={()=>copySessionCode(s.session_code)}>Salin kode</button></p><div className="session-meta"><span><MapPin size={14}/>{s.points_count??0} titik</span><span><CalendarDays size={14}/>{s.survey_date}</span><span><Users size={14}/>{s.my_role==='LEADER'?'Ketua Tim':'Anggota'}</span></div></div><span className={'status '+(s.is_locked?'done':'live')}>{s.is_locked?'Terkunci':'Aktif'}</span><button className="icon-button arrow" title="Detail sesi" onClick={()=>{setActive('Peta Inventaris');setSelectedSession(s)}}><ChevronRight size={18}/></button></article>)}</div>}</section>}</div></main>
  {createOpen&&<Modal title="Buat sesi survei baru" onClose={()=>setCreateOpen(false)}><form onSubmit={createSession} className="form-stack"><div className="type-switch"><button type="button" className={surveyType==='RUAS'?'chosen':''} onClick={()=>{setSurveyType('RUAS');setSegments('')}}>Survei Ruas Jalan</button><button type="button" className={surveyType==='SIMPANG'?'chosen':''} onClick={()=>{setSurveyType('SIMPANG');setSegments('Lengan A, Lengan B, Lengan C, Lengan D')}}>Survei Simpang</button></div><label>Kawasan kajian / lokasi<input required value={studyArea} onChange={e=>setStudyArea(e.target.value)} placeholder="Contoh: Koridor Jalan Raya Tabanan"/></label><label>Hari / tanggal<input type="date" value={surveyDate} onChange={e=>setSurveyDate(e.target.value)} required/></label><label>Cuaca<select value={weather} onChange={e=>setWeather(e.target.value)}>{weatherOptions.map(w=><option key={w}>{w}</option>)}</select></label><label>Catatan cuaca (opsional)<input value={weatherNote} onChange={e=>setWeatherNote(e.target.value)} placeholder="mis. cerah, sore gerimis"/></label><label>Daftar ruas / lengan (pisahkan koma atau baris baru)<textarea required rows={3} value={segments} onChange={e=>setSegments(e.target.value)} placeholder="Jl. Raya Utama, Jl. Merdeka"/></label><button className="primary-button full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Plus size={17}/>} Buat sesi & kode</button></form></Modal>}
  {joinOpen&&<Modal title="Gabung sesi survei" onClose={()=>setJoinOpen(false)}><form onSubmit={joinSession} className="form-stack"><label>Kode sesi<input required minLength={6} maxLength={8} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" className="code-input"/></label><p className="form-hint">Masukkan kode 6–8 karakter dari Ketua Tim.</p><button className="primary-button full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<ArrowRight size={17}/>} Gabung sesi</button></form></Modal>}
  </div>
}
function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><header><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></header>{children}</div></div>}
