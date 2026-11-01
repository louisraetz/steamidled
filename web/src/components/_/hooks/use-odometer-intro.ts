import { useEffect, useState } from 'react';

let introPlayed = false;

export function useOdometerIntro(): boolean {
  const [intro] = useState(() => !introPlayed);

  useEffect(() => {
    introPlayed = true;
  }, []);

  return intro;
}
