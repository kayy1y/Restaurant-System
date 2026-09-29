'use client';
import * as React from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import Balancer from 'react-wrap-balancer';
import { cn } from '@/lib/utils';
import { Cta, type CtaProps } from './hero-02-utils/cta';

export interface Hero02Props {
  title: string; titleLine2?: string; description: string; washImage?: string;
  animation?: 'none' | 'subtle'; primaryCTA: CtaProps; variant?: 'standard' | 'compact';
  children?: React.ReactNode; toolbar?: React.ReactNode;
}
const container: Variants = { hidden: {}, visible: {transition:{staggerChildren:0.1}} };
const item: Variants = {hidden:{opacity:0,y:12},visible:{opacity:1,y:0,transition:{duration:0.4}}};
export function Hero02({title,titleLine2,description,washImage,animation='none',primaryCTA,variant='compact',children,toolbar}: Hero02Props) {
  const reduce=useReducedMotion();
  const animate=animation==='subtle'&&!reduce;
  return <section className="restaurant-reports relative isolate w-full">
    <motion.div variants={container} initial={animate?'hidden':false} animate="visible" className={cn('mx-auto flex max-w-[1440px] flex-col gap-7',variant==='standard'?'py-10':'py-3')}>
      <motion.div variants={item} className="report-heading flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl"><p className="report-eyebrow">LA VID / CONTROL DEL RESTAURANTE</p><h1 className="report-title"><Balancer>{title}</Balancer>{titleLine2&&<><br/><Balancer>{titleLine2}</Balancer></>}</h1><p className="report-muted mt-3 max-w-xl text-sm leading-relaxed">{description}</p></div>
        <Cta cta={primaryCTA}/>
      </motion.div>
      {toolbar}
      <motion.div variants={item} className="report-stage relative overflow-hidden rounded-2xl border p-3 sm:p-6">
        {washImage&&<img src={washImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.04]"/>}
        <div className="relative">{children}</div>
      </motion.div>
    </motion.div>
  </section>;
}
export default Hero02;
