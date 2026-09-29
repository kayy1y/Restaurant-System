import * as React from 'react';
import * as Primitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
export const DropdownMenu=Primitive.Root;
export const DropdownMenuTrigger=Primitive.Trigger;
export const DropdownMenuContent=React.forwardRef<React.ElementRef<typeof Primitive.Content>,React.ComponentPropsWithoutRef<typeof Primitive.Content>>(({className,sideOffset=4,...props},ref)=><Primitive.Portal><Primitive.Content ref={ref} sideOffset={sideOffset} className={cn('ui-menu z-[100] min-w-48 rounded-lg border p-1 shadow-lg',className)} {...props}/></Primitive.Portal>);
export const DropdownMenuItem=React.forwardRef<React.ElementRef<typeof Primitive.Item>,React.ComponentPropsWithoutRef<typeof Primitive.Item>>(({className,...props},ref)=><Primitive.Item ref={ref} className={cn('ui-menu-item flex cursor-default select-none items-center gap-2 rounded px-3 py-2 text-sm outline-none data-[disabled]:opacity-50',className)} {...props}/>);
export const DropdownMenuSeparator=Primitive.Separator;
DropdownMenuContent.displayName='DropdownMenuContent'; DropdownMenuItem.displayName='DropdownMenuItem';
