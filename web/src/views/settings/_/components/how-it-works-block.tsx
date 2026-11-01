import { HOW_IT_WORKS } from '../constants/symbols';
import { HowItWorksRow } from './how-it-works-row';
import { SettingsBlock } from './settings-block';

export function HowItWorksBlock() {
  return (
    <SettingsBlock
      title="How it works"
      description="steamidled tells Steam you are playing the games you picked, so their playtime grows."
    >
      <dl className="flex flex-col gap-4">
        {HOW_IT_WORKS.map((row) => (
          <HowItWorksRow key={row.label} row={row} />
        ))}
      </dl>
    </SettingsBlock>
  );
}
