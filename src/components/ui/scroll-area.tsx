import * as React from 'react';
import * as Primitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';
export const ScrollArea = React.forwardRef<React.ElementRef<typeof Primitive.Root>, React.ComponentPropsWithoutRef<typeof Primitive.Root>>(({className, children, ...props}, ref) => <Primitive.Root ref={ref} className={cn('relative overflow-hidden',className)} {...props}><Primitive.Viewport className="h-full w-full rounded-[inherit]">{children}</Primitive.Viewport><ScrollBar/><Primitive.Corner/></Primitive.Root>);
export const ScrollBar = React.forwardRef<React.ElementRef<typeof Primitive.ScrollAreaScrollbar>, React.ComponentPropsWithoutRef<typeof Primitive.ScrollAreaScrollbar>>(({className, orientation='vertical', ...props}, ref) => <Primitive.ScrollAreaScrollbar ref={ref} orientation={orientation} className={cn('flex touch-none select-none p-px', orientation==='vertical'?'h-full w-2':'h-2 flex-col',className)} {...props}><Primitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-[var(--border-color)]"/></Primitive.ScrollAreaScrollbar>);
ScrollArea.displayName='ScrollArea'; ScrollBar.displayName='ScrollBar';
