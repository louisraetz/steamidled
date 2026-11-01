import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { STEAM_CAPSULE_SIZE } from '@/lib/constants';
import { capsuleUrl, gameInitials, revealLoadedImage } from './_/helpers/game-art';

interface GameArtProps {
  appid: number;
  name: string;
  size: 'md' | 'sm' | 'responsive';
  dimmed?: boolean;
}

export function GameArt({ appid, name, size, dimmed = false }: GameArtProps) {
  return (
    <Avatar
      shape="capsule"
      size={size}
      data-dimmed={dimmed}
      aria-hidden="true"
      className="data-[dimmed=true]:opacity-60 data-[dimmed=true]:grayscale"
    >
      <AvatarFallback>{gameInitials(name)}</AvatarFallback>
      <img
        src={capsuleUrl(appid)}
        alt=""
        width={STEAM_CAPSULE_SIZE.width}
        height={STEAM_CAPSULE_SIZE.height}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={revealLoadedImage}
        className="absolute inset-0 size-full object-cover opacity-0 data-[loaded=true]:opacity-100"
      />
    </Avatar>
  );
}
