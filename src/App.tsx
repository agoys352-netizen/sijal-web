import { useState } from 'react'
import { Map, ClipboardList, Users, Settings, Bell, Plus, Navigation, MapPin, Menu, ChevronRight, Activity, Route, Download } from 'lucide-react'

const sessions = [
  { name: 'Inventarisasi Perlengkapan Jalan', area: 'Denpasar Selatan · Bali', date: '26 Nov 2026', status: 'Berlangsung', count: 128 },
  { name: 'Audit Rambu dan Marka', area: 'Jalan By Pass Ngurah Rai', date: '24 Nov 2026', status: 'Draft', count: 64 },
  { name: 'Survei Fasilitas Keselamatan', area: 'Kawasan Sanur', date: '20 Nov 2026', status: 'Selesai', count: 213 },
]

export default function App() {
  const [active, setActive] = useState('Ringkasan')
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = [
    { label: 'Ringkasan', icon: Activity },
    { label: 'Sesi Survei', icon: ClipboardList },
    { label: 'Peta Inventaris', icon: Map },
    { label: 'Tim Surveyor', icon: Users },
    { label: 'Pengaturan', icon: Settings },
  ]
  return <div className="app-shell">
    <aside className={menuOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="brand-mark"><MapPin size={22}/></div><div><b>SIJAL</b><small>SISTEM INVENTARISASI JALAN</small></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(({label, icon: Icon}) => <button key={label} className={active===label?'nav-item selected':'nav-item'} onClick={()=>{setActive(label);setMenuOpen(false)}}><Icon size={18}/><span>{label}</span>{active===label&&<ChevronRight size={16} className="nav-chevron"/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="user-card"><div className="avatar">A</div><div><b>Administrator</b><small>Admin Workspace</small></div><Settings size={17}/></div><div className="version">SIJAL Web · v0.1.0</div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="icon-button menu-toggle" onClick={()=>setMenuOpen(!menuOpen)}><Menu size={20}/></button><div className="breadcrumb">Workspace <ChevronRight size={14}/> <b>{active}</b></div><div className="top-actions"><button className="icon-button"><Bell size={18}/></button><div className="avatar small">A</div></div></header>
      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow">KAMIS, 26 NOVEMBER 2026</div><h1>Selamat datang di SIJAL</h1><p>Kelola kegiatan inventarisasi perlengkapan jalan dalam satu workspace.</p></div><button className="primary-button" onClick={()=>setActive('Sesi Survei')}><Plus size={18}/> Buat sesi survei</button></div>
        <div className="stats-grid"><Stat icon={MapPin} label="Total titik inventaris" value="405" note="Titik terdata" color="blue"/><Stat icon={Route} label="Ruas / segmen" value="18" note="Segmen survei" color="cyan"/><Stat icon={Users} label="Surveyor aktif" value="6" note="Anggota tim" color="green"/><Stat icon={Activity} label="Sesi berjalan" value="2" note="Aktif saat ini" color="amber"/></div>
        <section className="section"><div className="section-head"><div><h2>Sesi survei terbaru</h2><p>Ringkasan aktivitas survei inventarisasi</p></div><button className="text-button" onClick={()=>setActive('Sesi Survei')}>Lihat semua <ChevronRight size={16}/></button></div>
          <div className="session-list">{sessions.map((s)=><article className="session-card" key={s.name}><div className="session-icon"><ClipboardList size={20}/></div><div className="session-info"><h3>{s.name}</h3><p>{s.area}</p><div className="session-meta"><span><MapPin size={14}/>{s.count} titik</span><span><Activity size={14}/>{s.date}</span></div></div><span className={'status '+(s.status==='Selesai'?'done':s.status==='Draft'?'draft':'live')}>{s.status}</span><button className="icon-button arrow"><ChevronRight size={18}/></button></article>)}</div></section>
        <section className="section"><div className="section-head"><div><h2>Mulai pekerjaan</h2><p>Akses cepat ke fitur utama SIJAL</p></div></div><div className="quick-grid"><Quick icon={Map} title="Pemetaan titik" desc="Plot lokasi perlengkapan jalan" onClick={()=>setActive('Peta Inventaris')}/><Quick icon={Users} title="Kelola tim" desc="Kolaborasi bersama surveyor" onClick={()=>setActive('Tim Surveyor')}/><Quick icon={Download} title="Export data" desc="Unduh data hasil survei" onClick={()=>setActive('Sesi Survei')}/></div></section>
        <div className="info-banner"><div className="banner-icon"><Navigation size={19}/></div><div><b>Survey lapangan lebih terstruktur</b><p>SIJAL membantu mencatat, memetakan, dan mengelola data perlengkapan jalan dengan koordinat GPS.</p></div></div>
      </div>
    </main>
  </div>
}

function Stat({icon: Icon,label,value,note,color}:{icon:any,label:string,value:string,note:string,color:string}){return <div className="stat-card"><div className={'stat-icon '+color}><Icon size={19}/></div><div className="stat-label">{label}</div><strong>{value}</strong><small>{note}</small></div>}
function Quick({icon:Icon,title,desc,onClick}:{icon:any,title:string,desc:string,onClick:()=>void}){return <button className="quick-card" onClick={onClick}><div className="quick-icon"><Icon size={20}/></div><div><b>{title}</b><small>{desc}</small></div><ChevronRight size={17}/></button>}