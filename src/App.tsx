import { useEffect, useMemo, useState } from 'react'
import { Activity, ClipboardList, ChevronRight, LogOut, Map, MapPin, Plus, Users, Settings, Menu, Search, Lock, AlertCircle, Check, ArrowRight, CalendarDays, LoaderCircle, Radio, UserPlus, Navigation, ClipboardCheck, Trash2, BarChart3, Route } from 'lucide-react'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import MapWorkspace from './MapWorkspace'
import DashboardAnalysis from './DashboardAnalysis'
import MasterRoads from './MasterRoads'

type SessionRow = {
  id: string; session_code: string; creator_id: string; creator_name: string; survey_type: string;
  study_area: string; survey_date: string; weather: string | null; segments_list: string[]; is_locked: boolean; road_segment_id?: string|null; road_name_snapshot?: string|null; road_code_snapshot?: string|null; road_regency_snapshot?: string|null; road_district_snapshot?: string|null; road_type_snapshot?: string|null;
  created_at: string; my_role?: string; points_count?: number
}
const navItems = [{label:'Sesi Survei',icon:ClipboardList},{label:'Master Ruas Jalan',icon:Route},{label:'Peta Inventaris',icon:Map},{label:'Tim Surveyor',icon:Users},{label:'Dashboard Analisis',icon:BarChart3},{label:'Pengaturan',icon:Settings}]
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
  const [deleteTarget,setDeleteTarget]=useState<SessionRow|null>(null),[deleteBusy,setDeleteBusy]=useState(false),[deleteError,setDeleteError]=useState('')
  const [surveyType,setSurveyType]=useState('RUAS'),[studyArea,setStudyArea]=useState(''),[surveyDate,setSurveyDate]=useState(today()),[weather,setWeather]=useState('Cerah'),[weatherNote,setWeatherNote]=useState('')
  const [segments,setSegments]=useState(''),[joinCode,setJoinCode]=useState(''),[masterRoads,setMasterRoads]=useState<{id:string;road_code:string;name:string;regency:string;district:string;road_type:string}[]>([]),[selectedRoadId,setSelectedRoadId]=useState('')
  const [search,setSearch]=useState(''),[selectedSession,setSelectedSession]=useState<SessionRow|null>(null)

  useEffect(()=>{ if(!supabase)return; supabase.auth.getSession().then(({data})=>setUser(data.session?.user??null)); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>setUser(session?.user??null));return()=>subscription.unsubscribe()},[])
  useEffect(()=>{if(user)loadSessions()},[user])
  useEffect(()=>{if(createOpen&&supabase){supabase.from('road_segments').select('id,road_code,name,regency,district,road_type').eq('status','ACTIVE').order('name').then(({data,error})=>{if(error){setError('Gagal memuat master ruas: '+error.message);setMasterRoads([])}else setMasterRoads(data||[])})}},[createOpen])
  useEffect(()=>{const road=masterRoads.find(r=>r.id===selectedRoadId);if(surveyType==='RUAS'&&road){setStudyArea(road.name);setSegments(road.name)}},[selectedRoadId,masterRoads,surveyType])
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
  async function deleteSession(){
    const target=deleteTarget;if(!target||!supabase||!user)return
    if(target.my_role!=='LEADER'){setDeleteError('Hanya ketua tim yang dapat menghapus sesi.');return}
    setDeleteBusy(true);setDeleteError('')
    try{
      const {data:points,error:pointErr}=await supabase.from('survey_points').select('id').eq('session_id',target.id)
      if(pointErr)throw pointErr
      const pointIds=(points||[]).map((p:any)=>p.id)
      let photoPaths:string[]=[]
      if(pointIds.length){
        const {data:photos,error:photoErr}=await supabase.from('point_photos').select('photo_url').in('point_id',pointIds)
        if(photoErr)throw photoErr
        photoPaths=(photos||[]).map((p:any)=>{const marker='/storage/v1/object/public/survey-photos/';const idx=(p.photo_url||'').indexOf(marker);return idx>=0?decodeURIComponent(p.photo_url.slice(idx+marker.length)):''}).filter(Boolean)
      }
      if(photoPaths.length){
        const {error:storageErr}=await supabase.storage.from('survey-photos').remove(photoPaths)
        if(storageErr)throw new Error('Gagal menghapus foto dokumentasi dari penyimpanan: '+storageErr.message)
      }
      const {error:deleteErr}=await supabase.rpc('delete_survey_session',{p_session_id:target.id})
      if(deleteErr)throw deleteErr
      setDeleteTarget(null);setNotice('Sesi '+target.session_code+' berhasil dihapus beserta data inventaris, anggota, tracking, layer peta, dan foto.');await loadSessions()
    }catch(e:any){setDeleteError(e.message||'Penghapusan sesi gagal')}
    finally{setDeleteBusy(false)}
  }
  async function createSession(e:React.FormEvent){
    e.preventDefault();if(!supabase||!user)return
    setBusy(true);setError('')
    const fullName=user.user_metadata?.full_name||user.email||'Surveyor'
    const selectedRoad=masterRoads.find(r=>r.id===selectedRoadId)
    const segs=surveyType==='RUAS'?(selectedRoad?[selectedRoad.name]:[]):segments.split(',').flatMap(s=>s.split(String.fromCharCode(10))).map(s=>s.trim()).filter(Boolean)
    const area=surveyType==='RUAS'?(selectedRoad?.name||''):studyArea.trim()
    if(surveyType==='RUAS'&&!selectedRoad){setError('Pilih master ruas jalan aktif terlebih dahulu.');setBusy(false);return}
    if(!area||!segs.length){setError('Lokasi kajian dan minimal satu ruas/lengan wajib diisi.');setBusy(false);return}
    const sessionCode=code()
    try{
      const {data:session,error:insertErr}=await supabase.from('survey_sessions').insert({session_code:sessionCode,creator_id:user.id,creator_name:fullName,survey_type:surveyType,study_area:area,survey_date:surveyDate,weather:weatherNote.trim()?weather+' — '+weatherNote.trim():weather,segments_list:segs,is_locked:false,road_segment_id:selectedRoad?.id||null}).select().single()
      if(insertErr)throw insertErr
      const {error:memberErr}=await supabase.from('session_members').insert({session_id:session.id,user_id:user.id,member_name:fullName,role:'LEADER'})
      if(memberErr)throw memberErr
      setCreateOpen(false);setNotice('Sesi dibuat! Kode sesi: '+sessionCode);setStudyArea('');setSegments('');setSelectedRoadId('');await loadSessions()
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
  const visibleSessions=useMemo(()=>sessions.filter(s=>(s.study_area+' '+s.session_code+' '+s.survey_type+' '+(s.road_name_snapshot||'')+' '+(s.road_code_snapshot||'')).toLowerCase().includes(search.toLowerCase())),[sessions,search])
  const [teamSessionId,setTeamSessionId]=useState('all'),[teamFilter,setTeamFilter]=useState('all'),[teamSearch,setTeamSearch]=useState('')
  const [teamMembers,setTeamMembers]=useState<any[]>([]),[teamLocations,setTeamLocations]=useState<any[]>([]),[teamPointCounts,setTeamPointCounts]=useState<Record<string,number>>({}),[teamBusy,setTeamBusy]=useState(false),[teamError,setTeamError]=useState('')
  async function loadTeam(){
    if(!supabase||!user)return
    setTeamBusy(true);setTeamError('')
    try{
      const {data:members,error:mErr}=await supabase.from('session_members').select('session_id,user_id,member_name,role').eq('user_id',user.id)
      if(mErr)throw mErr
      const sessionIds=(members||[]).map((m:any)=>m.session_id)
      if(!sessionIds.length){setTeamMembers([]);setTeamLocations([]);setTeamPointCounts({});return}
      const {data:sessionRows,error:sErr}=await supabase.from('survey_sessions').select('id,session_code,study_area,survey_date,is_locked').in('id',sessionIds)
      if(sErr)throw sErr
      const relevantIds=teamSessionId==='all'?sessionIds:sessionIds.filter((id:string)=>id===teamSessionId)
      const {data:allMembers,error:allMErr}=await supabase.from('session_members').select('session_id,user_id,member_name,role').in('session_id',relevantIds)
      if(allMErr)throw allMErr
      const {data:locs,error:lErr}=await supabase.from('surveyor_locations').select('*').in('session_id',relevantIds)
      if(lErr)throw lErr
      const {data:points,error:pErr}=await supabase.from('survey_points').select('session_id,surveyor_id,surveyor_name').in('session_id',relevantIds)
      if(pErr)throw pErr
      setTeamMembers((allMembers||[]).map((m:any)=>({...m,session:(sessionRows||[]).find((s:any)=>s.id===m.session_id)})))
      setTeamLocations(locs||[])
      const counts:Record<string,number>={};(points||[]).forEach((pt:any)=>{const key=pt.session_id+'|'+pt.surveyor_id;counts[key]=(counts[key]||0)+1})
      setTeamPointCounts(counts)
    }catch(e:any){setTeamError(e.message||'Gagal memuat data tim')}finally{setTeamBusy(false)}
  }
  useEffect(()=>{if(active==='Tim Surveyor'&&user)loadTeam()},[active,user,teamSessionId])
  useEffect(()=>{const client=supabase;if(!client||active!=='Tim Surveyor')return;const ch=client.channel('team-view-live').on('postgres_changes',{event:'*',schema:'public',table:'surveyor_locations'},()=>loadTeam()).on('postgres_changes',{event:'*',schema:'public',table:'session_members'},()=>loadTeam()).on('postgres_changes',{event:'*',schema:'public',table:'survey_points'},()=>loadTeam()).subscribe();return()=>{client.removeChannel(ch)}},[active,teamSessionId,user])
  const filteredTeam=useMemo(()=>teamMembers.filter((m:any)=>{const loc=teamLocations.find((l:any)=>l.session_id===m.session_id&&l.user_id===m.user_id);const online=!!loc?.is_tracking&&Date.now()-new Date(loc.updated_at).getTime()<90000;const q=(m.member_name+' '+m.session?.study_area+' '+m.session?.session_code).toLowerCase().includes(teamSearch.toLowerCase());return q&&(teamFilter==='all'||teamFilter==='live'&&online||teamFilter==='offline'&&!online||teamFilter==='leader'&&m.role==='LEADER')}),[teamMembers,teamLocations,teamFilter,teamSearch])

  if(!isSupabaseConfigured)return <div className="config-screen"><div className="config-card"><div className="brand-mark"><img src={logoUrl} alt="Logo SIJAL"/></div><h1>SIJAL</h1><h2>Konfigurasi Supabase diperlukan</h2><p>Frontend sudah siap, tetapi environment Supabase belum disetel pada build GitHub Pages.</p><div className="config-steps"><b>Tambahkan secrets repository GitHub:</b><code>VITE_SUPABASE_URL</code><code>VITE_SUPABASE_ANON_KEY</code><p>Settings → Secrets and variables → Actions. Setelah secret ditambahkan, jalankan ulang workflow deployment.</p></div><a href="https://github.com/agoys352-netizen/sijal-web/settings/secrets/actions">Buka GitHub Actions secrets</a></div></div>
  if(!user)return <div className="auth-screen"><div className="auth-brand"><div className="brand-mark"><img src={logoUrl} alt="Logo SIJAL"/></div><div><b>SIJAL</b><small>SISTEM INVENTARISASI JALAN</small></div></div><div className="auth-card"><div className="auth-heading"><h1>{authMode==='login'?'Selamat datang kembali':'Buat akun surveyor'}</h1><p>{authMode==='login'?'Masuk ke workspace survei Anda.':'Daftar akun untuk mulai membuat dan bergabung sesi.'}</p></div><form onSubmit={submitAuth} className="form-stack">{authMode==='signup'&&<label>Nama lengkap<input required value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Nama surveyor"/></label>}<label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" autoComplete="email"/></label><label>Password<input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete={authMode==='login'?'current-password':'new-password'}/></label><button className="primary-button full" disabled={authBusy}>{authBusy?<LoaderCircle className="spin"/>:null}{authMode==='login'?'Masuk':'Daftar akun'}</button></form>{error&&<div className="alert error"><AlertCircle size={17}/>{error}</div>}{notice&&<div className="alert success">{notice}</div>}<div className="auth-switch">{authMode==='login'?'Belum punya akun?':'Sudah memiliki akun?'} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setError('')}}>{authMode==='login'?'Daftar':'Masuk'}</button></div><div className="auth-foot"><Lock size={14}/> Akun personal · Data sesi berbasis hak akses</div></div><p className="auth-copyright">SIJAL Web · Sistem Inventarisasi Jalan</p></div>
  return <div className="app-shell"><aside className={menuOpen?'sidebar open':'sidebar'}><div className="brand"><div className="brand-mark"><img src={logoUrl} alt="Logo SIJAL"/></div><div><b>SIJAL</b><small>SISTEM INVENTARISASI JALAN</small></div></div><div className="workspace-label">WORKSPACE</div><nav>{navItems.map(({label,icon:Icon})=><button key={label} className={active===label?'nav-item selected':'nav-item'} onClick={()=>{setActive(label);setMenuOpen(false)}}><Icon size={18}/><span>{label}</span>{active===label&&<ChevronRight size={16} className="nav-chevron"/>}</button>)}</nav><div className="sidebar-bottom"><div className="user-card"><div className="avatar">{(user.user_metadata?.full_name||user.email||'S').charAt(0).toUpperCase()}</div><div className="user-details"><b>{user.user_metadata?.full_name||'Surveyor'}</b><small>{user.email}</small></div><button title="Keluar" className="icon-button logout" onClick={signOut}><LogOut size={17}/></button></div><div className="version">SIJAL Web · v0.2.0</div></div></aside>
  <main className="main"><header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{active}</b></div><div className="top-actions"><button className="icon-button" title="Refresh sesi" onClick={loadSessions}><Activity size={18}/></button><div className="avatar small">{(user.user_metadata?.full_name||'S').charAt(0).toUpperCase()}</div></div></header><div className="content"><div className="welcome-row"><div><div className="eyebrow">{new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase()}</div><h1>{active}</h1><p>{active==='Sesi Survei'?'Kelola sesi inventarisasi perlengkapan jalan, gabung tim, dan buka survei lapangan.':'Workspace survei terhubung ke database Supabase.'}</p></div>{active==='Sesi Survei'&&<div className="welcome-actions"><button className="secondary-button" onClick={()=>{setJoinOpen(true);setError('')}}><Users size={17}/> Gabung sesi</button><button className="primary-button" onClick={()=>{setCreateOpen(true);setError('')}}><Plus size={18}/> Buat sesi survei</button></div>}</div>
  {notice&&<div className="alert success notice"><Check size={18}/>{notice}<button onClick={()=>setNotice('')}>×</button></div>}{error&&<div className="alert error notice"><AlertCircle size={17}/>{error}<button onClick={()=>setError('')}>×</button></div>}
  {active==='Master Ruas Jalan'&&<MasterRoads userId={user.id}/>}{active==='Peta Inventaris'&&<section className="section map-session-picker"><div className="section-head"><div><h2>Pilih sesi untuk pemetaan</h2><p>Buka workspace peta dan input titik inventaris</p></div></div>{selectedSession?<MapWorkspace session={selectedSession} userId={user.id} userName={user.user_metadata?.full_name||user.email||'Surveyor'} onBack={()=>setSelectedSession(null)}/>:<div className="session-list">{sessions.map(s=><article className="session-card" key={s.id}><div className="session-icon"><Map size={20}/></div><div className="session-info"><h3>{s.study_area}</h3><p>{s.session_code} · {s.survey_type==='RUAS'?'Survei Ruas':'Survei Simpang'}</p>{s.road_segment_id&&<p className="session-road-link"><Route size={13}/> {s.road_code_snapshot||'Master ruas'} · {s.road_name_snapshot||s.study_area}</p>}<div className="session-meta"><span><MapPin size={14}/>{s.points_count||0} titik</span><span>{s.is_locked?'Terkunci':'Aktif'}</span></div></div><button className="primary-button" onClick={()=>setSelectedSession(s)}>Buka peta</button></article>)}</div>}</section>}{active==='Dashboard Analisis'&&<DashboardAnalysis userId={user.id} sessions={sessions}/>}{active==='Tim Surveyor'&&<section className="section team-page"><div className="team-summary-grid"><article className="team-stat"><div className="team-stat-icon blue"><Users size={18}/></div><span>Total anggota</span><strong>{teamMembers.length}</strong><small>Anggota pada sesi terpilih</small></article><article className="team-stat"><div className="team-stat-icon green"><Radio size={18}/></div><span>Live tracking</span><strong>{teamMembers.filter((m:any)=>{const l=teamLocations.find((x:any)=>x.session_id===m.session_id&&x.user_id===m.user_id);return !!l?.is_tracking&&Date.now()-new Date(l.updated_at).getTime()<90000}).length}</strong><small>Lokasi diperbarui ≤ 90 detik</small></article><article className="team-stat"><div className="team-stat-icon amber"><MapPin size={18}/></div><span>GPS terakhir</span><strong>{teamLocations.filter((l:any)=>!!l.latitude&&!!l.longitude).length}</strong><small>Anggota dengan lokasi tersedia</small></article><article className="team-stat"><div className="team-stat-icon violet"><ClipboardCheck size={18}/></div><span>Titik inventaris</span><strong>{Object.values(teamPointCounts).reduce((a,b)=>a+b,0)}</strong><small>Kontribusi pada sesi yang dipilih</small></article></div><div className="team-toolbar"><label className="team-session-select"><span>Sesi survei</span><select value={teamSessionId} onChange={e=>setTeamSessionId(e.target.value)}><option value="all">Semua sesi yang diikuti</option>{sessions.map(s=><option key={s.id} value={s.id}>{s.study_area} · {s.session_code}</option>)}</select></label><div className="team-search"><Search size={17}/><input value={teamSearch} onChange={e=>setTeamSearch(e.target.value)} placeholder="Cari nama anggota atau sesi"/></div><button className="secondary-button" onClick={loadTeam}><Activity size={16}/> Refresh</button></div><div className="team-filters"><button className={teamFilter==='all'?'team-filter active':''} onClick={()=>setTeamFilter('all')}>Semua ({teamMembers.length})</button><button className={teamFilter==='live'?'team-filter active':''} onClick={()=>setTeamFilter('live')}>Live</button><button className={teamFilter==='offline'?'team-filter active':''} onClick={()=>setTeamFilter('offline')}>Offline</button><button className={teamFilter==='leader'?'team-filter active':''} onClick={()=>setTeamFilter('leader')}>Ketua tim</button></div>{teamBusy&&<div className="loading"><LoaderCircle className="spin"/> Memuat data tim…</div>}{teamError&&<div className="alert error notice"><AlertCircle size={16}/>{teamError}</div>}{!teamBusy&&!teamError&&filteredTeam.length===0&&<div className="empty-state"><Users size={28}/><b>Belum ada anggota pada filter ini</b><p>Anggota yang bergabung dalam sesi akan muncul di sini.</p><button className="secondary-button" onClick={()=>setActive('Sesi Survei')}>Kelola sesi survei</button></div>}<div className="team-member-list">{filteredTeam.map((m:any)=>{const loc=teamLocations.find((l:any)=>l.session_id===m.session_id&&l.user_id===m.user_id);const isLive=!!loc?.is_tracking&&Date.now()-new Date(loc.updated_at).getTime()<90000;const count=teamPointCounts[m.session_id+'|'+m.user_id]||0;return <article className="team-member-card" key={m.session_id+'|'+m.user_id}><div className="team-member-main"><div className="team-avatar">{(m.member_name||'S').trim().charAt(0).toUpperCase()}</div><div className="team-member-identity"><strong>{m.member_name||'Surveyor'}</strong><span>{m.role==='LEADER'?'Ketua Tim':'Surveyor'} · {m.session?.study_area||'Sesi'}</span><span className={isLive?'team-live':'team-offline'}><i/> {isLive?'Live tracking aktif':loc?'Offline · lokasi terakhir tersedia':'Belum berbagi lokasi'}</span></div><span className="team-member-session">{m.session?.session_code||'—'}</span></div><div className="team-member-details"><div><small>Lokasi terakhir</small><b>{loc?.latitude!=null&&loc?.longitude!=null?loc.latitude.toFixed(5)+', '+loc.longitude.toFixed(5):'Belum tersedia'}</b></div><div><small>Akurasi GPS</small><b>{loc?.accuracy_m!=null?'± '+Math.round(loc.accuracy_m)+' meter':'—'}</b></div><div><small>Update terakhir</small><b>{loc?.updated_at?new Date(loc.updated_at).toLocaleString('id-ID'):'—'}</b></div><div><small>Inventaris dicatat</small><b>{count} titik</b></div></div><div className="team-member-footer"><span>{m.session?.study_area||'Sesi survei'}{m.session?.is_locked?' · Terkunci':''}</span>{loc?.latitude!=null&&loc?.longitude!=null?<a href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noreferrer" className="team-map-link"><Navigation size={14}/> Lihat di peta</a>:<span className="team-map-link disabled"><Navigation size={14}/> Lokasi belum ada</span>}</div></article>})}</div><div className="team-page-note"><UserPlus size={17}/> Untuk menambahkan anggota, gunakan <button onClick={()=>setActive('Sesi Survei')}>kode gabung dari halaman Sesi Survei</button>. Halaman ini khusus pengelolaan dan pemantauan anggota.</div></section>}{active==='Sesi Survei'&&<section className="section"><div className="section-head"><div><h2>Semua sesi survei</h2><p>Sesi tersimpan di cloud dan dapat diakses anggota tim</p></div></div><div className="session-summary-grid">
  <article className="session-summary-card navy"><div className="session-summary-icon"><ClipboardList size={18}/></div><div><span>Total sesi</span><strong>{sessions.length}</strong><small>Sesi yang Anda ikuti</small></div></article>
  <article className="session-summary-card cyan"><div className="session-summary-icon"><Activity size={18}/></div><div><span>Sesi terbuka</span><strong>{sessions.filter(s=>!s.is_locked).length}</strong><small>Belum dikunci</small></div></article>
  <article className="session-summary-card emerald"><div className="session-summary-icon"><MapPin size={18}/></div><div><span>Total titik</span><strong>{sessions.reduce((total,s)=>total+(s.points_count||0),0)}</strong><small>Inventaris di semua sesi</small></div></article>
  <article className="session-summary-card amber"><div className="session-summary-icon"><Lock size={18}/></div><div><span>Sesi terkunci</span><strong>{sessions.filter(s=>s.is_locked).length}</strong><small>Input telah dikunci</small></div></article>
</div><div className="session-tools"><div className="search-box"><Search size={17}/><input placeholder="Cari lokasi atau kode sesi" value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="secondary-button" onClick={()=>{setJoinOpen(true);setError('')}}><Users size={17}/> Gabung sesi</button></div>{busy&&<div className="loading"><LoaderCircle className="spin"/> Memuat data…</div>}{visibleSessions.length===0&&!busy?<div className="empty-state"><ClipboardList size={28}/><b>Belum ada sesi survei</b><p>Buat sesi baru atau bergabung menggunakan kode sesi dari ketua tim.</p><div><button className="primary-button" onClick={()=>{setSelectedRoadId('');setStudyArea('');setSegments('');setSurveyType('RUAS');setCreateOpen(true)}}><Plus size={17}/> Buat sesi</button><button className="secondary-button" onClick={()=>setJoinOpen(true)}>Gabung dengan kode</button></div></div>:<div className="session-list">{visibleSessions.map(s=><article className="session-card" key={s.id}><div className="session-icon"><ClipboardList size={20}/></div><div className="session-info"><h3>{s.study_area}</h3><p>{s.survey_type==='RUAS'?'Survei Ruas Jalan':'Survei Simpang'} · <b className="session-code-inline">{s.session_code}</b> <button type="button" className="copy-code-button" onClick={()=>copySessionCode(s.session_code)}>Salin kode</button></p><div className="session-meta"><span><MapPin size={14}/>{s.points_count??0} titik</span><span><CalendarDays size={14}/>{s.survey_date}</span><span><Users size={14}/>{s.my_role==='LEADER'?'Ketua Tim':'Anggota'}</span></div></div><span className={'status '+(s.is_locked?'done':'live')}>{s.is_locked?'Terkunci':'Aktif'}</span>{s.my_role==='LEADER'&&<button type="button" className="session-delete-button" title="Hapus sesi (Ketua Tim)" onClick={()=>{setDeleteTarget(s);setDeleteError('')}}><Trash2 size={16}/> Hapus</button>}<button className="icon-button arrow" title="Detail sesi" onClick={()=>{setActive('Peta Inventaris');setSelectedSession(s)}}><ChevronRight size={18}/></button></article>)}</div>}</section>}</div></main>
  {deleteTarget&&<Modal title="Hapus sesi survei?" onClose={()=>{if(!deleteBusy){setDeleteTarget(null);setDeleteError('')}}}><div className="delete-session-confirm"><div className="delete-session-warning"><Trash2 size={20}/><div><strong>Penghapusan permanen</strong><p>Sesi <b>{deleteTarget.study_area}</b> ({deleteTarget.session_code}) akan dihapus bersama seluruh anggota, titik inventaris, foto dokumentasi, lokasi tracking, dan layer peta.</p></div></div><p className="delete-session-count">Jumlah titik saat ini: <b>{deleteTarget.points_count||0}</b></p>{deleteError&&<div className="alert error">{deleteError}</div>}<div className="modal-actions"><button type="button" className="secondary-button" disabled={deleteBusy} onClick={()=>setDeleteTarget(null)}>Batal</button><button type="button" className="danger-button" disabled={deleteBusy} onClick={deleteSession}>{deleteBusy?<LoaderCircle className="spin" size={16}/>:<Trash2 size={16}/>} {deleteBusy?'Menghapus…':'Hapus permanen'}</button></div></div></Modal>}
  {createOpen&&<Modal title="Buat sesi survei baru" onClose={()=>setCreateOpen(false)}><form onSubmit={createSession} className="form-stack"><div className="type-switch"><button type="button" className={surveyType==='RUAS'?'chosen':''} onClick={()=>{setSurveyType('RUAS');setSegments('')}}>Survei Ruas Jalan</button><button type="button" className={surveyType==='SIMPANG'?'chosen':''} onClick={()=>{setSurveyType('SIMPANG');setSegments('Lengan A, Lengan B, Lengan C, Lengan D')}}>Survei Simpang</button></div>{surveyType==='RUAS'?<><label>Master ruas jalan (wajib)<select required value={selectedRoadId} onChange={e=>setSelectedRoadId(e.target.value)}><option value="">Pilih master ruas aktif…</option>{masterRoads.map(r=><option key={r.id} value={r.id}>{r.road_code} · {r.name} — {r.district}, {r.regency}</option>)}</select></label>{selectedRoadId&&<div className="form-hint">Ruas dipilih: {masterRoads.find(r=>r.id===selectedRoadId)?.name}. Identitas ruas akan tersimpan pada sesi dan titik inventaris.</div>}{!masterRoads.length&&<div className="form-hint">Belum ada master ruas aktif. Buat/aktifkan master ruas terlebih dahulu pada menu Master Ruas Jalan.</div>}</>:<><label>Kawasan kajian / lokasi simpang<input required value={studyArea} onChange={e=>setStudyArea(e.target.value)} placeholder="Contoh: Simpang Kediri"/></label><label>Ruas terkait (opsional)<select value={selectedRoadId} onChange={e=>setSelectedRoadId(e.target.value)}><option value="">Tidak mengaitkan master ruas</option>{masterRoads.map(r=><option key={r.id} value={r.id}>{r.road_code} · {r.name}</option>)}</select></label></>}<label>Hari / tanggal<input type="date" value={surveyDate} onChange={e=>setSurveyDate(e.target.value)} required/></label><label>Cuaca<select value={weather} onChange={e=>setWeather(e.target.value)}>{weatherOptions.map(w=><option key={w}>{w}</option>)}</select></label><label>Catatan cuaca (opsional)<input value={weatherNote} onChange={e=>setWeatherNote(e.target.value)} placeholder="mis. cerah, sore gerimis"/></label>{surveyType==='RUAS'?<label>Ruas inventaris (mengikuti master)<input value={segments} readOnly/></label>:<label>Daftar ruas / lengan (pisahkan koma atau baris baru)<textarea required rows={3} value={segments} onChange={e=>setSegments(e.target.value)} placeholder="Lengan A, Lengan B, Lengan C, Lengan D"/></label>}<button className="primary-button full" disabled={busy||surveyType==='RUAS'&&!selectedRoadId}>{busy?<LoaderCircle className="spin"/>:<Plus size={17}/>} Buat sesi & kode</button></form></Modal>}joinOpen&&<Modal title="Gabung sesi survei" onClose={()=>setJoinOpen(false)}><form onSubmit={joinSession} className="form-stack"><label>Kode sesi<input required minLength={6} maxLength={8} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} placeholder="ABC123" className="code-input"/></label><p className="form-hint">Masukkan kode 6–8 karakter dari Ketua Tim.</p><button className="primary-button full" disabled={busy}>{busy?<LoaderCircle className="spin"/>:<ArrowRight size={17}/>} Gabung sesi</button></form></Modal>}
  </div>
}
function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><header><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></header>{children}</div></div>}
