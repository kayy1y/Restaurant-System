import React from 'react';
import { Hero02 } from './ui/hero-02';
import { DashboardDemo } from './ui/hero-02-utils/dashboard-demo';
import { Skeleton } from './ui/skeleton';
import { getReportData, summarizeReports } from '../services/reportService.js';
import { liveSync } from '../services/liveSync.js';

export default function ReportsDashboard() {
  const [data,setData]=React.useState({orders:[],payments:[],source:''});
  const [days,setDays]=React.useState(7);
  const [metric,setMetric]=React.useState('orders');
  const [updated,setUpdated]=React.useState(null);
  const [loading,setLoading]=React.useState(true);
  const [error,setError]=React.useState('');
  const [refresh,setRefresh]=React.useState(0);
  React.useEffect(()=>{
    let mounted=true, running=false, pending=false;
    async function load() {
      if(running){pending=true;return;}
      running=true;
      try {
        const result=await getReportData();
        if(mounted){setData(result);setUpdated(new Date());setError('');}
      }catch(e){if(mounted)setError(e.message);}
      finally{running=false;if(mounted){setLoading(false);if(pending){pending=false;load();}}}
    }
    load();
    const events=['ORDER_CREATED','ORDER_UPDATED','ORDER_CANCELLED','ORDER_DELIVERED','BILL_REQUESTED','KDS_STATUS_CHANGED','PAYMENT_COMPLETED','FISCAL_UPDATED','TABLE_RELEASED'];
    const subscriptions=events.map(event=>liveSync.subscribe(event,load));
    const timer=setInterval(()=>{if(document.visibilityState==='visible')load();},5000);
    const onVisible=()=>{if(document.visibilityState==='visible')load();};
    document.addEventListener('visibilitychange',onVisible);
    return ()=>{mounted=false;clearInterval(timer);subscriptions.forEach(stop=>stop());document.removeEventListener('visibilitychange',onVisible);};
  },[refresh]);
  const summary=React.useMemo(()=>summarizeReports(data,days),[data,days]);
  return <Hero02 title="El restaurante," titleLine2="en una sola vista." description="Seguí los pedidos, los cobros y el ritmo del servicio con información de tu operación." animation="subtle" primaryCTA={{text:'Actualizar datos',onClick:()=>setRefresh(v=>v+1)}} toolbar={
    <div className="report-toolbar">
      <div className="report-segment" aria-label="Período del reporte">{[7,30].map(value=><button key={value} aria-pressed={days===value} className={days===value?'selected':''} onClick={()=>setDays(value)}>Últimos {value} días</button>)}</div>
      <p className="report-muted text-xs" role="status">{error?'Actualización interrumpida':loading?'Cargando información…':`${data.source} · Actualizado ${updated?.toLocaleTimeString('es-CR')}`}<span className="block mt-1">Por eventos de pedidos y comprobación cada 5 segundos</span></p>
    </div>
  }>
    {error&&<div role="alert" className="report-error mb-5">{error}{updated&&<p>Se conserva la última consulta correcta.</p>}</div>}
    {loading?<div aria-label="Cargando reportes" className="space-y-5"><div className="grid grid-cols-2 gap-4"><Skeleton className="h-28"/><Skeleton className="h-28"/></div><Skeleton className="h-72"/></div>:<DashboardDemo summary={summary} metric={metric} onMetricChange={setMetric}/>}
  </Hero02>;
}
