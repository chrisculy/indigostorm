import { useState } from 'react';
import type { MotionSetting, TextSize, ThemeSetting } from '../../state/settings.ts';
import { useGame } from '../../state/store.ts';
import { UiIcon } from '../art/index.ts';
import { Button, Dialog, Segmented, Switch } from '../components/index.ts';
import { ScreenFrame } from './ScreenFrame.tsx';

export function SettingsScreen() {
  const s = useGame((st) => st.settings);
  const update = useGame((st) => st.updateSettings);
  const resetAll = useGame((st) => st.resetAll);
  const [confirm, setConfirm] = useState(false);
  return (
    <ScreenFrame title="Settings" subtitle="Saved on this device with your progress.">
      <div className="settings">
        <section className="settings__group" aria-labelledby="set-look">
          <h2 id="set-look" className="sec-title">
            Look
          </h2>
          <Segmented<ThemeSetting>
            label="Theme"
            value={s.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'dark', label: 'Dark', icon: <UiIcon name="moon" /> },
              { value: 'light', label: 'Light', icon: <UiIcon name="sun" /> },
              { value: 'contrast', label: 'High contrast', icon: <UiIcon name="contrast" /> },
              { value: 'system', label: 'System' },
            ]}
          />
          <Segmented<TextSize>
            label="Text size"
            value={s.textSize}
            onChange={(textSize) => update({ textSize })}
            options={[
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Normal' },
              { value: 'lg', label: 'Large' },
              { value: 'xl', label: 'Extra large' },
            ]}
          />
          <Switch
            checked={s.hcSuits}
            onChange={(hcSuits) => update({ hcSuits })}
            label="High-contrast suits"
            description="Stronger Recon / Stealth / Force colors. Suits always carry their shape too."
          />
          <Segmented<MotionSetting>
            label="Motion"
            value={s.motion}
            onChange={(motion) => update({ motion })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
            ]}
          />
          <Switch
            checked={s.hoverPreview}
            onChange={(hoverPreview) => update({ hoverPreview })}
            label="Card preview on hover"
            description="Show a larger copy of a card when you rest the pointer on it."
          />
        </section>
        <section className="settings__group" aria-labelledby="set-play">
          <h2 id="set-play" className="sec-title">
            Play
          </h2>
          <Switch
            checked={s.confirmPlays}
            onChange={(confirmPlays) => update({ confirmPlays })}
            label="Confirm each play"
            description="Choosing an option arms it; click it again or press Enter to play it."
          />
          <Switch
            checked={s.confirmEndPlays}
            onChange={(confirmEndPlays) => update({ confirmEndPlays })}
            label="Confirm before ending plays"
            description="Ask before the Pressure step starts, with a forecast of what will happen."
          />
          <Switch
            checked={s.autoHardenedResolve}
            onChange={(autoHardenedResolve) => update({ autoHardenedResolve })}
            label="Always use Hardened Resolve"
            description="Answer “yes” automatically when Exposure would hit the redline."
          />
          <Switch
            checked={s.autoDeclineSmallCover}
            onChange={(autoDeclineSmallCover) => update({ autoDeclineSmallCover })}
            label="Skip Ally Cover for 1-point effects"
            description="Keep your Allies instead of being asked about effects worth a single point."
          />
        </section>
        <section className="settings__group" aria-labelledby="set-data">
          <h2 id="set-data" className="sec-title">
            Data
          </h2>
          <p className="muted">Removes your campaign, best Stars, the episode in progress and these settings.</p>
          <div>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Reset all data
            </Button>
          </div>
        </section>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset all data?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirm(false);
                resetAll();
              }}
            >
              Reset everything
            </Button>
          </>
        }
      >
        <p>This cannot be undone. Export a save first if you want to keep your progress.</p>
      </Dialog>
    </ScreenFrame>
  );
}
