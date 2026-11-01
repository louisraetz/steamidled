function visibleTrigger(appid: number): HTMLElement | undefined {
  const triggers = document.querySelectorAll<HTMLElement>(`[data-menu-for="${appid}"]`);
  return [...triggers].find((trigger) => trigger.offsetParent !== null);
}

function focusLost(): boolean {
  const active = document.activeElement;
  return active === null || active === document.body || !active.isConnected;
}

export function focusMenuTrigger(appid: number): void {
  setTimeout(() =>
    requestAnimationFrame(() => {
      if (focusLost()) visibleTrigger(appid)?.focus();
    })
  );
}
