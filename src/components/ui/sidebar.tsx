'use client';
import { useState, type ElementType } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './scroll-area';
import { Avatar, AvatarFallback } from './avatar';
import { Button } from './button';
import { Separator } from './separator';
import { DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem } from './dropdown-menu';

type NavItem={id:string;label:string;icon:ElementType};
interface Props { items:NavItem[]; activeTab:string; onNavigate:(id:string)=>void; userName:string; roleName:string; onLogout?:()=>void }
export function SessionNavBar({items,activeTab,onNavigate,userName,roleName,onLogout}:Props) {
  const [collapsed,setCollapsed]=useState(false);
  const [hover,setHover]=useState(false);
  const reduce=useReducedMotion();
  const expanded=!collapsed||hover;
  return <motion.aside initial={false} className={cn('restaurant-sidebar',expanded?'is-expanded':'is-collapsed')} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
    <div className="nav-brand"><span className="nav-monogram">LV</span><div className="nav-label"><strong>La Vid</strong><small>Steak House & Pizza</small></div><Button variant="ghost" size="icon" className="nav-collapse" onClick={()=>{setCollapsed(!collapsed);setHover(false);}} aria-label={collapsed?'Expandir navegación':'Contraer navegación'} aria-expanded={expanded}>{collapsed?<PanelLeftOpen size={16}/>:<PanelLeftClose size={16}/>}</Button></div>
    <Separator className="hidden md:block"/>
    <ScrollArea className="nav-scroll"><nav aria-label="Módulos del restaurante" className="nav-items"><p className="nav-label nav-section-title">OPERACIÓN</p>{items.map((item,index)=><div key={item.id}>{index>0&&item.id==='reportes'&&<Separator className="my-3 hidden md:block"/>}<button type="button" title={item.label} aria-label={item.label} aria-current={item.id===activeTab?'page':undefined} className={cn('nav-item',item.id===activeTab&&'is-active')} onClick={()=>onNavigate(item.id)}><item.icon size={18} aria-hidden="true"/><span className="nav-label">{item.label}</span></button></div>)}</nav></ScrollArea>
    <div className="nav-account"><Separator/><DropdownMenu><DropdownMenuTrigger asChild><button className="nav-item mt-3 w-full" aria-label="Opciones de la sesión"><Avatar><AvatarFallback>{userName.split(' ').map(n=>n[0]).slice(0,2).join('')}</AvatarFallback></Avatar><span className="nav-label text-left"><strong className="block text-sm">{userName}</strong><small>{roleName}</small></span><ChevronDown className="nav-label ml-auto" size={14}/></button></DropdownMenuTrigger><DropdownMenuContent align="start"><div className="p-3 text-sm">{userName}<p className="report-muted text-xs">{roleName}</p></div><DropdownMenuItem onSelect={onLogout}><LogOut size={15}/>Cerrar sesión</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
  </motion.aside>;
}
