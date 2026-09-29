import { useState } from 'react';
import { processState } from '../../../utils/processState.js';
import { Card,CardHeader,CardTitle,CardDescription,CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReceiptText, ShoppingBag, Clock3, TrendingUp } from 'lucide-react';

type Point={date:string;label:string;orders:number;revenue:number};
type Ranking={name:string;value:number};
interface Summary {series:Point[];revenue:number;orderCount:number;paymentCount:number;average:number;open:number;products:Ranking[];waiters:Ranking[];statuses:Ranking[];recent:{id:string;table_name?:string;waiter_name?:string;status:string;total:number}[]}
const money=(n:number)=>new Intl.NumberFormat('es-CR',{style:'currency',currency:'CRC',maximumFractionDigits:0}).format(n);
const stateName=(s:string)=>s.toLowerCase().replaceAll('_',' ');
function RankingChart({rows,currency=false}:{rows:Ranking[];currency?:boolean}) {
  const max=Math.max(1,...rows.map(r=>r.value));
  return <div className="space-y-4">{rows.length?rows.map((row,i)=><div key={row.name}><div className="flex justify-between gap-4 text-sm"><span className="truncate"><span className="report-muted mr-3 text-xs">{String(i+1).padStart(2,'0')}</span>{row.name}</span><strong className="tabular-nums shrink-0">{currency?money(row.value):row.value}</strong></div><div className="report-track mt-2 h-1.5 rounded"><div className="report-bar h-full rounded" style={{width:`${row.value/max*100}%`}}/></div></div>):<p className="report-empty">Sin registros en este período.</p>}</div>;
}
export function DashboardDemo({summary,metric,onMetricChange}:{summary:Summary;metric:'orders'|'revenue';onMetricChange:(value:'orders'|'revenue')=>void}) {
  const [selected,setSelected]=useState<string|null>(null);
  const points=summary.series;
  const maximum=metric==='orders'?Math.max(2,Math.ceil(Math.max(0,...points.map(p=>p.orders))/2)*2):Math.max(1,...points.map(p=>p.revenue));
  const x=(i:number)=>52+i*650/Math.max(1,points.length-1);
  const y=(v:number)=>200-v/maximum*155;
  const path=points.map((p,i)=>`${i?'L':'M'} ${x(i)} ${y(p[metric])}`).join(' ');
  const active=points.find(p=>p.date===selected);
  const cards=[{label:'Cobros registrados',value:money(summary.revenue),note:`${summary.paymentCount} pagos en el período`,icon:ReceiptText},{label:'Pedidos recibidos',value:summary.orderCount,note:'Excluye cancelados',icon:ShoppingBag},{label:'Promedio por pago',value:money(summary.average),note:'Sobre cobros registrados',icon:TrendingUp},{label:'Cuentas abiertas',value:summary.open,note:'Pedidos del período pendientes',icon:Clock3}];
  return <div className="space-y-5">
    <div className="report-kpis grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(c=><Card key={c.label}><CardHeader><div className="flex items-center justify-between gap-2"><CardDescription>{c.label}</CardDescription><c.icon size={16} className="report-muted"/></div></CardHeader><CardContent><p className="text-2xl font-semibold tracking-tight tabular-nums">{c.value}</p><p className="report-muted mt-2 text-xs">{c.note}</p></CardContent></Card>)}</div>
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(250px,1fr)]">
      <Card><CardHeader><div className="flex flex-wrap justify-between items-center gap-3"><div><CardTitle>Evolución del restaurante</CardTitle><CardDescription>Actividad diaria · hora de Costa Rica</CardDescription></div><div className="report-segment" aria-label="Métrica del gráfico">{(['orders','revenue'] as const).map(v=><button key={v} aria-pressed={metric===v} onClick={()=>onMetricChange(v)} className={metric===v?'selected':''}>{v==='orders'?'Pedidos':'Cobros'}</button>)}</div></div></CardHeader><CardContent>
        <div className="report-chart-readout" aria-live="polite">{active?`${active.label}: ${metric==='revenue'?money(active.revenue):`${active.orders} pedidos`}`:'Seleccioná un día para ver su detalle'}</div>
        <div className="overflow-x-auto"><svg viewBox="0 0 740 235" className="w-full min-w-[500px]" role="img" aria-label={metric==='orders'?'Pedidos por día':'Cobros diarios en colones'}>
          {[0,.5,1].map(t=><g key={t}><line x1="52" x2="710" y1={y(maximum*t)} y2={y(maximum*t)} stroke="var(--border-color)" strokeDasharray="3 4"/><text x="44" y={y(maximum*t)+4} textAnchor="end" fontSize="10" fill="var(--text-muted)">{metric==='revenue'?new Intl.NumberFormat('es-CR',{notation:'compact'}).format(maximum*t):Math.round(maximum*t)}</text></g>)}
          <path d={`${path} L ${x(points.length-1)} 200 L 52 200 Z`} fill="var(--report-accent)" opacity=".08"/>
          <path d={path} fill="none" stroke="var(--report-accent)" strokeWidth="2.5" strokeLinejoin="round"/>
          {points.map((p,i)=><g key={p.date}><circle cx={x(i)} cy={y(p[metric])} r="4" fill="var(--report-accent)"/><circle cx={x(i)} cy={y(p[metric])} r="12" fill="transparent" role="button" tabIndex={0} aria-label={`${p.label}: ${p[metric]}`} onMouseEnter={()=>setSelected(p.date)} onFocus={()=>setSelected(p.date)} onClick={()=>setSelected(p.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setSelected(p.date);}}><title>{p.label}: {metric==='revenue'?money(p.revenue):p.orders}</title></circle>{(points.length<=7||i%5===0||i===points.length-1)&&<text x={x(i)} y="226" textAnchor="middle" fontSize="10" fill="var(--text-muted)">{p.label}</text>}</g>)}
        </svg></div>
        <details className="report-muted text-xs mt-3"><summary className="cursor-pointer">Ver datos del gráfico</summary><div className="max-h-44 overflow-auto"><table className="report-table"><thead><tr><th>Día</th><th>Pedidos</th><th>Cobros</th></tr></thead><tbody>{points.map(p=><tr key={p.date}><td>{p.label}</td><td>{p.orders}</td><td>{money(p.revenue)}</td></tr>)}</tbody></table></div></details>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Estado de los pedidos</CardTitle><CardDescription>Distribución en el período</CardDescription></CardHeader><CardContent><RankingChart rows={summary.statuses.map(r=>({...r,name:stateName(r.name)}))}/></CardContent></Card>
    </div>
    <div className="grid gap-5 lg:grid-cols-2"><Card><CardHeader><CardTitle>Los más solicitados</CardTitle><CardDescription>Unidades pedidas · excluye productos retirados</CardDescription></CardHeader><CardContent><RankingChart rows={summary.products}/></CardContent></Card><Card><CardHeader><CardTitle>Cobros por salonero</CardTitle><CardDescription>Pagos vinculados al responsable del pedido</CardDescription></CardHeader><CardContent><RankingChart rows={summary.waiters} currency/></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Últimos pedidos</CardTitle><CardDescription>Actividad reciente del período seleccionado</CardDescription></CardHeader><CardContent><div className="overflow-auto"><table className="report-table"><thead><tr><th>Mesa</th><th>Responsable</th><th>Estado</th><th className="text-right">Importe del pedido</th></tr></thead><tbody>{summary.recent.map(o=><tr key={o.id}><td>{o.table_name||'Para llevar'}</td><td>{o.waiter_name||'Sin asignar'}</td><td><Badge variant="secondary" className="process-badge" data-process={processState(o.status).tone}>{stateName(o.status)}</Badge></td><td className="text-right tabular-nums">{money(o.total)}</td></tr>)}</tbody></table>{!summary.recent.length&&<p className="report-empty">Los pedidos aparecerán aquí al registrarse.</p>}</div></CardContent></Card>
  </div>;
}
