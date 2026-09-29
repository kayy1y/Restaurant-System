import * as React from 'react';
import * as Primitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
export const Avatar = React.forwardRef<React.ElementRef<typeof Primitive.Root>, React.ComponentPropsWithoutRef<typeof Primitive.Root>>(({className, ...props}, ref) => <Primitive.Root ref={ref} className={cn('relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full',className)} {...props}/>);
export const AvatarImage = React.forwardRef<React.ElementRef<typeof Primitive.Image>, React.ComponentPropsWithoutRef<typeof Primitive.Image>>(({className, ...props}, ref) => <Primitive.Image ref={ref} className={cn('aspect-square h-full w-full',className)} {...props}/>);
export const AvatarFallback = React.forwardRef<React.ElementRef<typeof Primitive.Fallback>, React.ComponentPropsWithoutRef<typeof Primitive.Fallback>>(({className, ...props}, ref) => <Primitive.Fallback ref={ref} className={cn('ui-button-secondary flex h-full w-full items-center justify-center rounded-full text-xs',className)} {...props}/>);
Avatar.displayName = 'Avatar'; AvatarImage.displayName = 'AvatarImage'; AvatarFallback.displayName = 'AvatarFallback';
