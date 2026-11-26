import { useEffect, useMemo, useState } from 'react'
import { Activity, ClipboardList, ChevronRight, LogOut, Map, MapPin, Plus, Users, Settings, Menu, Search, Lock, Cloud, AlertCircle, Check, ArrowRight, CalendarDays, Route, LoaderCircle } from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'

type SessionRow = {
  id: string; session_code: string; creator_id: string; creator_name: string; survey_type: string;
  study_area: string; survey_date: string; weather: string | null; segments_list: string[]; is_locked: boolean;
  created_at: string; my_role?: string; points_count?: number
}
const navItems = [{label:'Ringkasan',icon:Activity},{label:'Sesi Survei',icon:ClipboardList},{label:'Peta Inventaris',icon:Map},{label:'Tim Surveyor',icon:Users},{label:'Pengaturan',icon:Settings}]
const weatherOptions=['Cerah','Berawan','Mendung','Gerimis','Hujan']
const today=()=>new Date().toISOString().slice(0,10)
const code=()=>Math.random().toString(36).slice(2,8).toUpperCase()
const equipment=['Rambu Peringatan','Rambu Larangan','Rambu Perintah','Rambu Petunjuk','RPPJ','PJU','Guardrail','Deleniator','Kaca Cembung / Cermin Tikungan','Halte','APILL','Marka Jalan','Pita Penggaduh','ZoSS','Pagar Pengaman','Lainnya (Ketik Manual)']

export default function App(){
  const [active,setActive]=useState('Ringkasan'),[menuOpen,setMenuOpen]=useState(false)
  const [user,setUser]=useState<any>(null),[authMode,setAuthMode]=useState<'login'|'signup'>('login')
  const [authName,setAuthName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState('')
  const [authBusy,setAuthBusy]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  const [sessions,setSessions]=useState<SessionRow[]>([]),[createOpen,setCreateOpen]=useState(false),[joinOpen,setJoinOpen]=useState(false)
  const [surveyType,setSurveyType]=useState('RUAS'),[studyArea,setStudyArea]=useState(''),[surveyDate,setSurveyDate]=useState(today()),[weather,setWeather]=useState('Cerah'),[weatherNote,setWeatherNote]=useState('')
  const [segments,setSegments]=useState(''),[joinCode,setJoinCode]=useState('')
  const [search,setSearch]=useState('')

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
  async function signOut(){await supabase?.auth.signOut();setUser(null);setSessions([]);setActive('Ringkasan')}
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
    setBusy(true);setError('')
    try{
      const {data:s,error:findErr}=await supabase.from('survey_sessions').select('*').eq('session_code',joinCode.trim().toUpperCase()).maybeSingle()
      if(findErr)throw findErr;if(!s)throw new Error('Kode sesi tidak ditemukan.')
      if(s.is_locked)throw new Error('Sesi sudah terkunci, tidak dapat bergabung.')
      const {data:existing}=await supabase.from('session_members').select('id').eq('session_id',s.id).eq('user_id',user.id).maybeSingle()
      if(existing){setNotice('Anda sudah terdaftar pada sesi tersebut.');setJoinOpen(false);return}
      const {error:joinErr}=await supabase.from('session_members').insert({session_id:s.id,user_id:user.id,member_name:user.user_metadata?.full_name||user.email||'Surveyor',role:'MEMBER'})
      if(joinErr)throw joinErr
      setJoinOpen(false);setJoinCode('');setNotice('Berhasil bergabung ke sesi '+s.session_code);await loadSessions()
    }catch(e:any){setError(e.message??'Gagal bergabung')}finally{setBusy(false)}
  }
  const visibleSessions=useMemo(()=>sessions.filter(s=>(s.study_area+' '+s.session_code+' '+s.survey_type).toLowerCase().includes(search.toLowerCase())),[sessions,search])
  if(!isSupabaseConfigured)return <div className="config-screen"><div className="config-card"><div className="brand-mark"><MapPin/></div><h1>SIJAL</h1><h2>Konfigurasi Supabase diperlukan</h2><p>Frontend sudah siap, tetapi environment Supabase belum disetel pada build GitHub Pages.</p><div className="config-steps"><b>Tambahkan secrets repository GitHub:</b><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code><p>Settings → Secrets and variables → Actions. Setelah secret ditambahkan, jalankan ulang workflow deployment.</p></div><a href="https://github.com/agoys352-netizen/sijal-web/settings/secrets/actions">Buka GitHub Actions secrets</a></div></div>
  if(!user)return <div className="auth-screen"><div className="auth-brand"><div className="brand-mark"><MapPin/></div><div><b>SIJAL</b><small>SISTEM INVENTARISASI JALAN</small></div></div><div className="auth-card"><div className="auth-heading"><h1>{authMode==='login'?'Selamat datang kembali':'Buat akun surveyor'}</h1><p>{authMode==='login'?'Masuk ke workspace survei Anda.':'Daftar akun untuk mulai membuat dan bergabung sesi.'}</p></div><form onSubmit={submitAuth} className="form-stack">{authMode==='signup'&&<label>Nama lengkap<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Nama surveyor"/></label>}<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email"/></label><label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete={authMode==='login'?'current-password':'new-password'}/></label><button className="primary-button full" disabled={authBusy}>{authBusy?<LoaderCircle className="spin"/>:null}{authMode==='login'?'Masuk':'Daftar akun'}</button></form>{error&&<div className="alert error"><AlertCircle size={17}/>{error}</div>}{notice&&<div className="alert success">{notice}</div>}<div className="auth-switch">{authMode==='login'?'Belum punya akun?':'Sudah memiliki akun?'} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setError('')}}>{authMode==='login'?'Daftar':'Masuk'}</button></div><div className="auth-foot"><Lock size={14}/> Akun personal · Data sesi berbasis hak akses</div></div><p className="auth-copyright">SIJAL Web · Sistem Inventarisasi Jalan</p></div>
  return <div className="app-shell"><aside className={menuOpen?'sidebar open':'sidebar'}><div className="brand"><div className="brand-mark"><MapPin size={22}/></div><div><b>SIJAL</b><small>SISTEM INVENTARISASI JALAN</small></div></div><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(({label,icon:Icon})=><button key={label} className={active===label?'nav-item selected':'nav-item'} onClick={()=>{setActive(label);setMenuOpen(false)}}><Icon size={18}/><span>{label}</span>{active===label&&<ChevronRight size={16} className="nav-chevron"/>}</button>)}</nav><div className="sidebar-bottom"><div className="user-card"><div className="avatar">{(user.user_metadata?.full_name||user.email||'S').charAt(0).toUpperCase()}</div><div className="user-details"><b>{user.user_metadata?.full_name||'Surveyor'}</b><small>{user.email}</small></div><button title="Keluar" className="icon-button logout" onClick={signOut}><LogOut size={17}/></button></div><div className="version">SIJAL Web · v0.2.0</div></div></aside>
  <main className="main"><header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{active}</b></div><div className="top-actions"><button className="icon-button" title="Refresh sesi" onClick={loadSessions}><Activity size={18}/></button><div className="avatar small">{(user.user_metadata?.full_name||'S').charAt(0).toUpperCase()}</div></div></header><div className="content"><div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase()}</div><h1>{active==='Ringkasan'?'Selamat datang di SIJAL':active}</h1><p>{active==='Ringkasan'?'Kelola kegiatan inventarisasi perlengkapan jalan dalam satu workspace.':'Workspace survei terhubung ke database Supabase.'}</p></div><button className="primary-button" onClick={()=>{setCreateOpen(true);setError('')}}><Plus size={18}/> Buat sesi survei</button></div>
  {notice&&<div className="alert success notice"><Check size={18}/>{notice}<button onClick={()=>setNotice('')}>×</button></div>}{error&&<div className="alert error notice"><AlertCircle size={17}/>{error}<button onClick={()=>setError('')}>×</button></div>}
  <div className="stats-grid"><Stat icon={MapPin} label="Total titik inventaris" value={sessions.reduce((n,s)=>n+(s.points_count||0),0).toLocaleString('id-ID')} note="Dari sesi Anda" color="blue"/><Stat icon={Route} label="Sesi survei" value={sessions.length.toLocaleString('id-ID')} note="Sesi terdaftar" color="cyan"/><Stat icon={Users} label="Surveyor aktif" value="—" note="Data anggota dimuat di sesi" color="green"/><Stat icon={Activity} label="Sesi berjalan" value={sessions.filter(s=>!s.is_locked).length.toLocaleString('id-ID')} note="Belum dikunci" color="amber"/></div>
  <section className="section"><div className="section-head"><div><h2>{active==='Sesi Survei'?'Semua sesi survei':'Sesi survei Anda'}</h2><p>Sesi tersimpan di cloud dan dapat diakses anggota tim</p></div><button className="text-button" onClick={()=>setActive('Sesi Survei')}>Lihat semua <ChevronRight size={16}/></button></div><div className="session-tools"><div className="search-box"><Search size={17}/><input placeholder="Cari lokasi atau kode sesi" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="secondary-button" onClick={()=>{setJoinOpen(true);setError('')}}><Users size={17}/> Gabung sesi</button></div>{busy&&<div className="loading"><LoaderCircle className="spin"/> Memuat data…</div>}{visibleSessions.length===0&&!busy?<div className="empty-state"><ClipboardList size={28}/><b>Belum ada sesi survei</b><p>Buat sesi baru atau bergabung menggunakan kode sesi dari ketua tim.</p><div><button className="primary-button" onClick={()=>setCreateOpen(true)}><Plus size={17}/> Buat sesi</button><button className="secondary-button" onClick={()=>setJoinOpen(true)}>Gabung dengan kode</button></div></div>:<div className="session-list">{visibleSessions.map(s=><article className="session-card" key={s.id}><div className="session-icon"><ClipboardList size={20}/></div><div className="session-info"><h3>{s.study_area}</h3><p>{s.survey_type==='RUAS'?'Survei Ruas Jalan':'Survei Simpang'} · {s.session_code}</p><div className="session-meta"><span><MapPin size={14}/>{s.points_count??0} titik</span><span><CalendarDays size={14}/>{s.survey_date}</span><span><Users size={14}/>{s.my_role==='LEADER'?'Ketua Tim':'Anggota'}</span></div></div><span className={'status '+(s.is_locked?'done':'live')}>{s.is_locked?'Terkunci':'Aktif'}</span><button className="icon-button arrow" title="Detail sesi" onClick={()=>setNotice('Workspace peta dan detail sesi sedang masuk tahap pengembangan berikutnya.')}><ChevronRight size={18}/></button></article>)}</div>}</section><section className="section"><div className="section-head"><div><h2>Mulai pekerjaan</h2><p>Akses cepat ke fitur utama</p></div></div><div className="quick-grid"><Quick icon={Map} title="Pemetaan titik" desc="Workspace peta akan dibangun pada sprint berikutnya" onClick={()=>setActive('Peta Inventaris')}/><Quick icon={Users} title="Kelola tim" desc="Lihat sesi dan anggota" onClick={()=>setActive('Tim Surveyor')}/><Quick icon={Cloud} title="Data tersinkron" desc="Sesi disimpan di Supabase Cloud" onClick={()=>loadSessions()}/></div></section></div></main>
  {createOpen&&<Modal title="Buat sesi survei baru" onClose={()=>setCreateOpen(false)}><form onSubmit={createSession} className="form-stack"><div className="type-switch"><button type="button" className={surveyType==='RUAS'?'chosen':''} onClick={()=>{setSurveyType('RUAS');setSegments('')}}>Survei Ruas Jalan</button><button type="button" className={surveyType==='SIMPANG'?'chosen':''} onClick={()=>{setSurveyType('SIMPANG');setSegments('Lengan A, Lengan B, Lengan C, Lengan D')}}>Survei Simpang</button></div><label>Kawasan kajian / lokasi<input required value={studyArea} onChange={e=>setStudyArea(e.target.value)} placeholder="Contoh: Koridor Jalan Raya Tabanan"/></label><label>Hari / tanggal<input type="date" value={surveyDate} onChange={e=>setSurveyDate(e.target.value)} required/></label><label>Cuaca<select value={weather} onChange={e=>setWeather(e.target.value)}>{weatherOptions.map(w=><option key={w}>{w}</option>)}</select></label><label>Catatan cuaca (opsional)<input value={weatherNote} onChange={e=>setWeatherNote(e.target.value)} placeholder="mis. cerah, sore gerimis"/></label><label>Daftar ruas / lengan (pisahkan koma atau baris baru)<textarea required rows={3} value={segments} onChange={e=>setSegments(e.target.value)} placeholder="Jl. Raya Utama, Jl. Merdeka"/></label><button className="primary-button full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<Plus size={17}/>} Buat sesi & kode</button></form></Modal>}
  {joinOpen&&<Modal title="Gabung sesi survei" onClose={()=>setJoinOpen(false)}><form onSubmit={joinSession} className="form-stack"><label>Kode sesi<input required minLength={6} maxLength={8} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" className="code-input"/></label><p className="form-hint">Masukkan kode 6–8 karakter dari Ketua Tim.</p><button className="primary-button full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<ArrowRight size={17}/>} Gabung sesi</button></form></Modal>}
  </div>
}
function Stat({icon:Icon,label,value,note,color}:{icon:any,label:string,value:string,note:string,color:string}){return <div className="stat-card"><div className={'stat-icon '+color}><Icon size={19}/></div><div className="stat-label">{label}</div><strong>{value}</strong><small>{note}</small></div>}
function Quick({icon:Icon,title,desc,onClick}:{icon:any,title:string,desc:string,onClick:()=>void}){return <button className="quick-card" onClick={onClick}><div className="quick-icon"><Icon size={20}/></div><div><b>{title}</b><small>{desc}</small></div><ChevronRight size={17}/></button>}
function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><header><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></header>{children}</div></div>}
