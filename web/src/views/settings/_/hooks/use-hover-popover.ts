import { useRef, useState, type FocusEvent, type MouseEvent, type PointerEvent } from 'react';

export function useHoverPopover() {
  const [open, setOpen] = useState(false);
  const hovered = useRef(false);

  return {
    open,
    onOpenChange: setOpen,
    triggerProps: {
      onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType !== 'mouse') return;
        hovered.current = true;
        setOpen(true);
      },
      onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => {
        if (event.pointerType !== 'mouse') return;
        hovered.current = false;
        setOpen(false);
      },
      onFocus: (event: FocusEvent<HTMLButtonElement>) => {
        if (event.currentTarget.matches(':focus-visible')) setOpen(true);
      },
      onClick: (event: MouseEvent<HTMLButtonElement>) => {
        if (hovered.current) event.preventDefault();
      },
    },
    keepFocus: (event: Event) => event.preventDefault(),
  };
}
