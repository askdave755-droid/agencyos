import { useMemo, useRef, useState } from "react";
import {
  Activity, Bell, Building2, ChevronDown, CircleHelp, Cloud, Download, ExternalLink, Gauge,
  LayoutDashboard, MapPin, MessageSquare, MoreHorizontal, Plus, Search,
  Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Target, Upload,
  Users, WandSparkles, X
} from "lucide-react";

type Lane = "A" | "B" | "C" | "D" | "Unknown";
type Prospect = {
  id: string; name: string; city: string; state: string; rating?: number;
  reviews?: number; website: "yes" | "no" | "unknown";
  ads: "active" | "good" | "none-found" | "problem" | "unknown";
  lane: Lane; score: number; issue: string; offer: string; status: string;
  source: string; demo?: boolean;
};

const starterProspects: Prospect[] = [
  { id:"demo-1", name:"Copper State Comfort", city:"Phoenix", state:"AZ", rating:4.2, reviews:86, website:"yes", ads:"problem", lane:"B", score:88, issue:"Ad landing page has no clear estimate request above the fold.", offer:"Repair the ad-to-landing-page conversion path", status:"Needs review", source:"Illustrative demo record", demo:true },
  { id:"demo-2", name:"Desert Ridge Air", city:"Scottsdale", state:"AZ", rating:4.7, reviews:214, website:"yes", ads:"none-found", lane:"C", score:82, issue:"Website found; no active ads verified in this sample.", offer:"Local lead-generation campaign", status:"Ready to research", source:"Illustrative demo record", demo:true },
  { id:"demo-3", name:"Valley Breeze Heating & Cooling", city:"Mesa", state:"AZ", rating:4.5, reviews:132, website:"no", ads:"unknown", lane:"A", score:79, issue:"No business website verified.", offer:"Website foundation", status:"Needs review", source:"Illustrative demo record", demo:true },
  { id:"demo-4", name:"Sonoran Mechanical", city:"Chandler", state:"AZ", rating:4.8, reviews:301, website:"yes", ads:"good", lane:"D", score:34, issue:"Website and ads appear established; no clear gap identified yet.", offer:"Nurture — do not force a sale", status:"Nurture", source:"Illustrative demo record", demo:true },
  { id:"demo-5", name:"East Valley Climate Pros", city:"Gilbert", state:"AZ", rating:4.1, reviews:58, website:"unknown", ads:"unknown", lane:"Unknown", score:0, issue:"Not enough verified evidence to classify.", offer:"Research required", status:"Unverified", source:"Illustrative demo record", demo:true }
];

const laneInfo: Record<Lane, {label:string; offer:string; color:string}> = {
  A:{label:"Website opportunity",offer:"Build the website first",color:"orange"},
  B:{label:"Ads need fixing",offer:"Fix the identified ad problem",color:"red"},
  C:{label:"No active ads verified",offer:"Advertising / lead generation",color:"blue"},
  D:{label:"Already established",offer:"Skip or nurture",color:"green"},
  Unknown:{label:"Needs more evidence",offer:"Research before recommending",color:"gray"}
};

function classify(website: Prospect["website"], ads: Prospect["ads"]): Lane {
  if (website === "no") return "A";
  if (website === "unknown" || ads === "unknown") return "Unknown";
  if (ads === "problem") return "B";
  if (website === "yes" && ads === "none-found") return "C";
  if (website === "yes" && ads === "good") return "D";
  return "Unknown";
}

function parseCsv(text: string): Prospect[] {
  const rows = text.trim().split(/\r?\n/);
  if (rows.length < 2) return [];
  const headers = rows[0].split(",").map(x=>x.trim().toLowerCase());
  const get = (parts:string[], key:string) => parts[headers.indexOf(key)]?.trim().replace(/^"|"$/g,"") || "";
  return rows.slice(1).map((row,i)=>{
    const parts = row.match(/(".*?"|[^",]+)(?=,|$)/g)?.map(x=>x.replace(/^,|,$/g,"")) ?? row.split(",");
    const name = get(parts,"name") || get(parts,"business") || "";
    if (!name) return null;
    const websiteRaw = get(parts,"website").toLowerCase();
    const adsRaw = get(parts,"ads").toLowerCase();
    const website:Prospect["website"] = websiteRaw==="no"||websiteRaw==="none"?"no":websiteRaw==="yes"||websiteRaw.startsWith("http")?"yes":"unknown";
    const ads:Prospect["ads"] = adsRaw==="problem"?"problem":adsRaw==="good"?"good":adsRaw==="active"?"active":adsRaw==="none"||adsRaw==="none-found"?"none-found":"unknown";
    const lane = classify(website,ads);
    return {id:"import-"+Date.now()+"-"+i,name,city:get(parts,"city")||"—",state:get(parts,"state")||"AZ",website,ads,lane,score:0,issue:"Imported record — audit evidence not yet verified.",offer:laneInfo[lane].offer,status:"Imported",source:"CSV import"} as Prospect;
  }).filter((x):x is Prospect=>Boolean(x));
}

function LanePill({lane}:{lane:Lane}) {
  return <span className={`lane-pill ${lane.toLowerCase()}`}><span />{lane==="Unknown"?"Review":`Lane ${lane}`}</span>;
}

export default function App() {
  const [prospects,setProspects] = useState<Prospect[]>(starterProspects);
  const [activeLane,setActiveLane] = useState<"All"|Lane>("All");
  const [query,setQuery] = useState("");
  const [showNotice,setShowNotice] = useState(true);
  const [selected,setSelected] = useState<Prospect|null>(null);
  const [activeNav,setActiveNav] = useState("Overview");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(()=>prospects.filter(p=>{
    const matchesLane = activeLane==="All" || p.lane===activeLane;
    const q=query.toLowerCase();
    return matchesLane && [p.name,p.city,p.issue,p.offer].some(v=>v.toLowerCase().includes(q));
  }),[prospects,activeLane,query]);

  const counts = useMemo(()=>({
    total:prospects.length,
    a:prospects.filter(p=>p.lane==="A").length,
    b:prospects.filter(p=>p.lane==="B").length,
    c:prospects.filter(p=>p.lane==="C").length,
    d:prospects.filter(p=>p.lane==="D").length,
    unknown:prospects.filter(p=>p.lane==="Unknown").length
  }),[prospects]);

  const handleImport = async (file?:File) => {
    if(!file) return;
    const imported = parseCsv(await file.text());
    if(imported.length) setProspects(prev=>[...imported,...prev]);
    else window.alert("No businesses imported. Include a CSV header with at least a name column.");
    if(fileRef.current) fileRef.current.value="";
  };

  const exportCsv = () => {
    const header = ["name","city","state","website","ads","lane","score","issue","offer","status"];
    const lines = [header.join(","),...prospects.map(p=>[p.name,p.city,p.state,p.website,p.ads,p.lane,p.score,p.issue,p.offer,p.status].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","))];
    const blob = new Blob([lines.join("\n")],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="agencyos-prospects.csv";a.click();URL.revokeObjectURL(url);
  };

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Activity size={21}/></div><div><strong>AGENCY<span>OS</span></strong><small>GROWTH OPERATING SYSTEM</small></div></div>
      <div className="workspace"><div className="workspace-avatar">N</div><div><b>Nexus Growth Partners</b><small>HVAC vertical</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      {[
        {name:"Overview",icon:LayoutDashboard},
        {name:"MyPI Prospects",icon:Target},
        {name:"Audits & Research",icon:Gauge},
        {name:"Outreach",icon:MessageSquare},
        {name:"Pipeline",icon:Users}
      ].map(item=><button key={item.name} className={`nav-item ${activeNav===item.name?"active":""}`} onClick={()=>setActiveNav(item.name)}><item.icon size={17}/>{item.name}{item.name==="MyPI Prospects"&&<span className="nav-count">{prospects.length}</span>}</button>)}
      <div className="nav-label nav-label-lower">SYSTEM</div>
      <button className={`nav-item ${activeNav==="Integrations"?"active":""}`} onClick={()=>setActiveNav("Integrations")}><Cloud size={17}/>Integrations</button>
      <button className={`nav-item ${activeNav==="Settings"?"active":""}`} onClick={()=>setActiveNav("Settings")}><Settings2 size={17}/>Settings</button>
      <div className="sidebar-bottom"><div className="help-icon"><CircleHelp size={17}/></div><div><b>Need a hand?</b><small>AgencyOS setup guide</small></div><ExternalLink size={14}/></div>
      <div className="profile"><div className="profile-avatar">DH</div><div><b>Agency Owner</b><small>Administrator</small></div><MoreHorizontal size={18}/></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <b>{activeNav}</b></div><div className="top-actions"><span className="market-tag"><MapPin size={13}/> PHOENIX METRO, AZ</span><button className="icon-button" aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">DH</div></div></header>
      <div className="page-wrap">
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> YOUR AGENCY COMMAND CENTER</div><h1>{activeNav==="Overview"?"Good morning. Let's find your next client.":activeNav}</h1><p>Research local HVAC companies, uncover growth gaps, and focus on the opportunities worth pursuing.</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={exportCsv}><Download size={16}/> Export</button><button className="btn btn-primary" onClick={()=>fileRef.current?.click()}><Upload size={16}/> Import prospects</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={e=>handleImport(e.target.files?.[0])}/></div></div>

        {showNotice&&<div className="notice"><div className="notice-icon"><ShieldCheck size={18}/></div><div><b>Evidence first. No guessing.</b><p>Lane decisions are based on verified website and advertising evidence. Missing data stays in <b>Needs Review</b> — it is never treated as proof that a business has no ads.</p></div><button onClick={()=>setShowNotice(false)} aria-label="Dismiss notice"><X size={16}/></button></div>}

        <section className="stats-grid">
          <div className="stat-card"><div className="stat-top"><span>Businesses in workspace</span><Building2 size={17}/></div><div className="stat-number">{counts.total}<small> prospects</small></div><div className="stat-foot"><span className="stat-muted">Phoenix metro target market</span></div></div>
          <div className="stat-card"><div className="stat-top"><span>Website opportunities</span><span className="stat-dot orange"/></div><div className="stat-number">{counts.a}</div><div className="stat-foot"><span className="stat-muted">Lane A · Website first</span></div></div>
          <div className="stat-card"><div className="stat-top"><span>Ads to improve</span><span className="stat-dot red"/></div><div className="stat-number">{counts.b}</div><div className="stat-foot"><span className="stat-muted">Lane B · Fix the problem</span></div></div>
          <div className="stat-card"><div className="stat-top"><span>Advertising opportunities</span><span className="stat-dot blue"/></div><div className="stat-number">{counts.c}</div><div className="stat-foot"><span className="stat-muted">Lane C · Lead generation</span></div></div>
          <div className="stat-card"><div className="stat-top"><span>Need more evidence</span><span className="stat-dot gray"/></div><div className="stat-number">{counts.unknown}</div><div className="stat-foot"><span className="stat-muted">Unknown · Research required</span></div></div>
        </section>

        <section className="content-grid">
          <div className="panel prospects-panel">
            <div className="panel-heading"><div><div className="panel-kicker">MYPI · PROSPECT INTELLIGENCE</div><h2>Prospect workspace</h2><p>Every business gets a diagnosis before it gets a pitch.</p></div><button className="btn btn-light" onClick={()=>fileRef.current?.click()}><Plus size={15}/> Add prospects</button></div>
            <div className="toolbar"><div className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search business, city, or opportunity..."/><kbd>⌘ K</kbd></div><button className="filter-button" onClick={()=>setActiveLane("All")}><SlidersHorizontal size={15}/> Filters <ChevronDown size={14}/></button></div>
            <div className="lane-tabs">
              {(["All","A","B","C","D","Unknown"] as const).map(lane=><button key={lane} onClick={()=>setActiveLane(lane)} className={activeLane===lane?"selected":""}>{lane==="All"?"All prospects":lane==="Unknown"?"Review":`Lane ${lane}`}<span>{lane==="All"?counts.total:lane==="A"?counts.a:lane==="B"?counts.b:lane==="C"?counts.c:lane==="D"?counts.d:counts.unknown}</span></button>)}
            </div>
            <div className="table-wrap"><table><thead><tr><th>BUSINESS</th><th>LOCATION</th><th>RATING</th><th>DIAGNOSIS</th><th>LANE</th><th>SCORE</th><th></th></tr></thead><tbody>
              {filtered.map(p=><tr key={p.id} onClick={()=>setSelected(p)} className="clickable-row"><td><div className="business-cell"><div className="business-logo">{p.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div><b>{p.name}</b><small>{p.demo?"Sample record · replace with live data":p.source}</small></div></div></td><td><span className="location-cell">{p.city}, {p.state}</span></td><td>{p.rating?<span className="rating">★ {p.rating.toFixed(1)} <small>({p.reviews})</small></span>:<span className="muted">—</span>}</td><td><span className="diagnosis">{p.issue}</span></td><td><LanePill lane={p.lane}/></td><td>{p.score?<div className="score-cell"><b>{p.score}</b><span className="score-track"><i style={{width:`${p.score}%`}}/></span></div>:<span className="muted">—</span>}</td><td><MoreHorizontal size={17} className="muted"/></td></tr>)}
              {filtered.length===0&&<tr><td colSpan={7} className="empty-state">No prospects match this view. Import a CSV or change your filters.</td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Showing {filtered.length} of {prospects.length} prospects</span><span className="demo-label"><i/> Sample workspace data</span></div>
          </div>

          <div className="right-column">
            <div className="panel discovery-panel"><div className="panel-heading compact"><div><div className="panel-kicker">NEXT ACTION</div><h2>Build your first list</h2></div><div className="mini-icon"><WandSparkles size={18}/></div></div><p className="panel-copy">Find HVAC contractors across the Phoenix metro and bring their public business data into MyPI.</p><div className="target-box"><div><MapPin size={15}/><b>Phoenix metropolitan area</b></div><small>Phoenix · Mesa · Scottsdale · Chandler · Gilbert · Glendale · Tempe · Peoria</small></div><div className="integration-line"><span className="status-dot pending"/><div><b>HasData connection</b><small>API key setup required</small></div><button className="text-button" onClick={()=>setActiveNav("Integrations")}>Configure</button></div><button className="btn btn-primary full" disabled title="Connect HasData before running live discovery"><Search size={16}/> Run live discovery <span className="soon">NOT CONNECTED</span></button><div className="tiny-note">Live discovery is disabled until the API is configured securely on the server.</div></div>

            <div className="panel lane-guide"><div className="panel-heading compact"><div><div className="panel-kicker">THE SALES DECISION ENGINE</div><h2>Four lanes. One clear offer.</h2></div></div>{(["A","B","C","D"] as Lane[]).map(l=><div className="lane-guide-row" key={l}><LanePill lane={l}/><div><b>{laneInfo[l].label}</b><small>{laneInfo[l].offer}</small></div></div>)}<div className="unknown-note"><ShieldCheck size={14}/> Insufficient evidence? Keep it unclassified.</div></div>
          </div>
        </section>

        <footer className="footer"><span>AGENCYOS <b>0.1.0</b> · BUILT FOR NEXUS GROWTH PARTNERS</span><span>PHOENIX HVAC PILOT <i/> HUMAN APPROVAL REQUIRED</span></footer>
      </div>
    </main>

    {selected&&<div className="drawer-backdrop" onClick={()=>setSelected(null)}><aside className="detail-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-top"><span className="panel-kicker">PROSPECT PROFILE</span><button className="icon-button" onClick={()=>setSelected(null)}><X size={18}/></button></div><div className="drawer-title"><div className="business-logo large">{selected.name.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div><h2>{selected.name}</h2><p><MapPin size={13}/>{selected.city}, {selected.state}</p></div></div><LanePill lane={selected.lane}/><div className="drawer-section"><h3>Diagnosis</h3><p>{selected.issue}</p></div><div className="drawer-section"><h3>Recommended next step</h3><div className="recommendation"><Sparkles size={16}/><b>{selected.offer}</b></div></div><div className="drawer-section"><h3>Evidence status</h3><div className="evidence-row"><span>Website</span><b>{selected.website==="yes"?"Found":selected.website==="no"?"Not found":"Unknown"}</b></div><div className="evidence-row"><span>Advertising</span><b>{selected.ads==="good"?"Good ads verified":selected.ads==="active"?"Active — quality not assessed":selected.ads==="problem"?"Problem identified":selected.ads==="none-found"?"No ads found — verify coverage":"Unknown"}</b></div><div className="evidence-row"><span>Source</span><b>{selected.source}</b></div></div><div className="drawer-warning"><ShieldCheck size={16}/> Confirm the evidence before contacting this business. No automated messages are sent.</div><button className="btn btn-primary full" onClick={()=>setSelected(null)}>Close profile</button></aside></div>}
  </div>;
}
