import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDaemonState } from '@/hooks/use-daemon-state';
import type { LoginActions } from '../types/login-actions';
import type { LoginMethod } from '../types/login-stage';
import { PasswordLogin } from './password-login';
import { QrLogin } from './qr-login';

export function LoginMethods({ actions }: { actions: LoginActions }) {
  const serverMethod = useDaemonState((snapshot) => snapshot.login?.method) ?? 'qr';
  const [method, setMethod] = useState<LoginMethod>(serverMethod);

  const changeMethod = (next: string) => {
    setMethod(next as LoginMethod);
    actions.startQr.reset();
    actions.password.reset();
    if (next === 'password') actions.cancel.mutate();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Sign in to Steam</h1>
        <p className="text-muted-foreground">The login is saved on this machine, so idling survives restarts.</p>
      </div>
      <Tabs value={method} onValueChange={changeMethod} className="gap-6">
        <TabsList variant="line">
          <TabsTrigger value="qr">QR code</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        <TabsContent value="qr">
          <QrLogin actions={actions} />
        </TabsContent>
        <TabsContent value="password">
          <PasswordLogin actions={actions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
