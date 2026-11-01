import { QRCodeSVG } from 'qrcode.react';
import { QR_SIZE } from '../constants/login';

export function QrCode({ value, hidden }: { value: string; hidden: boolean }) {
  return (
    <div
      data-hidden={hidden}
      aria-hidden={hidden}
      className="text-background transition-opacity duration-200 ease-out data-[hidden=true]:opacity-0 motion-reduce:transition-none"
    >
      <QRCodeSVG
        value={value}
        size={QR_SIZE}
        level="M"
        marginSize={4}
        fgColor="currentColor"
        bgColor="transparent"
        title="Steam sign-in QR code"
      />
    </div>
  );
}
