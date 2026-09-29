import { supabase } from '../lib/supabase.js';
import { dbGetAll } from './db.js';

export async function getReportData() {
  if (!supabase) {
    const [orders, payments] = await Promise.all([dbGetAll('orders'), dbGetAll('fiscal_queue')]);
    return { orders, payments: payments.filter(p => !['ANULADO','RECHAZADO'].includes(p.status) && !String(p.doc_type).toLowerCase().includes('crédito')), source: 'Datos locales' };
  }
  // Paginar evita que el límite REST de 1000 filas recorte silenciosamente las gráficas.
  async function all(table, columns) {
    const rows=[];
    for(let start=0;;start+=1000) {
      const {data,error}=await supabase.from(table).select(columns).order('id').range(start,start+999);
      if(error) throw new Error(`No se pudo consultar ${table}: ${error.message}`);
      rows.push(...data);
      if(data.length<1000) return rows;
    }
  }
  const [orders,details,payments]=await Promise.all([
    all('pedidos','id,nombre_mesa,nombre_salonero,estado,total,creado_en'),
    all('detalles_pedido','id,pedido_id,nombre_producto,cantidad,estado'),
    all('pagos','id,pedido_id,total,pagado_en,estado_fiscal')
  ]);
  const byOrder=new Map();
  for(const d of details) { if(!byOrder.has(d.pedido_id))byOrder.set(d.pedido_id,[]); byOrder.get(d.pedido_id).push({product_name:d.nombre_producto,quantity:Number(d.cantidad),status:d.estado}); }
  return {
    orders:orders.map(o=>({id:o.id,table_name:o.nombre_mesa,waiter_name:o.nombre_salonero,status:o.estado,total:Number(o.total),created_at:o.creado_en,items:byOrder.get(o.id)||[]})),
    payments:payments.filter(p=>p.estado_fiscal!=='ANULADO').map(p=>({id:p.id,order_id:p.pedido_id,total:Number(p.total),created_at:p.pagado_en})),
    source:'Datos de Supabase'
  };
}

export function summarizeReports(data, days=7, now=new Date()) {
  const key=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  const today=new Date(`${key(now)}T12:00:00-06:00`);
  const series=Array.from({length:days},(_,i)=>{const d=new Date(today);d.setUTCDate(d.getUTCDate()-(days-1-i));return {date:key(d),label:new Intl.DateTimeFormat('es-CR',{timeZone:'America/Costa_Rica',day:'numeric',month:'short'}).format(d),orders:0,revenue:0};});
  const byDate=new Map(series.map(day=>[day.date,day]));
  const within=row=>{const date=new Date(row.created_at); return !Number.isNaN(date.valueOf()) && byDate.has(key(date));};
  const orders=data.orders.filter(within);
  const valid=orders.filter(o=>String(o.status).toUpperCase()!=='CANCELADO');
  const payments=data.payments.filter(within);
  for(const o of valid) byDate.get(key(new Date(o.created_at))).orders++;
  for(const p of payments) byDate.get(key(new Date(p.created_at))).revenue+=Number(p.total)||0;
  const products=new Map(),waiters=new Map(),statuses=new Map();
  for(const o of orders) statuses.set(o.status,(statuses.get(o.status)||0)+1);
  for(const o of valid)for(const item of o.items||[]) {
    if(['RETIRADO_DE_CUENTA','CANCELADO'].includes(String(item.status).toUpperCase()))continue;
    const name=item.product_name||item.name||'Producto';products.set(name,(products.get(name)||0)+(Number(item.quantity)||0));
  }
  const orderIndex=new Map(data.orders.map(o=>[o.id,o]));
  for(const p of payments){const name=orderIndex.get(p.order_id)?.waiter_name||'Sin asignar';waiters.set(name,(waiters.get(name)||0)+(Number(p.total)||0));}
  const revenue=payments.reduce((sum,p)=>sum+(Number(p.total)||0),0);
  const ranking=map=>Array.from(map,([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  return {series,revenue,orderCount:valid.length,paymentCount:payments.length,average:payments.length?revenue/payments.length:0,open:valid.filter(o=>!['PAGADO','CANCELADO'].includes(String(o.status).toUpperCase())).length,products:ranking(products).slice(0,6),waiters:ranking(waiters).slice(0,5),statuses:ranking(statuses),recent:[...orders].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,7)};
}
