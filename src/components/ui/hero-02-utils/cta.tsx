import { Button, type ButtonProps } from '@/components/ui/button';
export interface CtaProps { ctaEnabled?: boolean; text: string; link?: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; onClick?: () => void; disabled?: boolean }
export function Cta({cta}: {cta: CtaProps}) {
  if (cta.ctaEnabled === false) return null;
  return <Button variant={cta.variant} size={cta.size} disabled={cta.disabled} onClick={cta.onClick} asChild={Boolean(cta.link)}>{cta.link ? <a href={cta.link}>{cta.text}</a> : cta.text}</Button>;
}
