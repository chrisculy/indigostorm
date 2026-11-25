import { useState } from 'react';
import { gameData } from '../../data/index.ts';
import { campaignFinished } from '../../engine/index.ts';
import { useGame } from '../../state/store.ts';
import { Logo, UiIcon } from '../art/index.ts';
import { Button, Dialog } from '../components/index.ts';

export function TitleScreen() {
  const episode = useGame((s) => s.episode);
  const campaign = useGame((s) => s.campaign);
  const go = useGame((s) => s.go);
  const startCampaign = useGame((s) => s.startCampaign);
  const [confirmNew, setConfirmNew] = useState(false);

  let continueLabel = '';
  let onContinue: (() => void) | null = null;
  if (episode) {
    const s = episode.state;
    continueLabel =
      s.phase === 'over'
        ? `Day ${s.day} debrief (${episode.mode})`
        : `Day ${s.day} · Turn ${Math.max(1, s.turn)} (${episode.mode === 'campaign' ? 'campaign' : 'prototype'})`;
    onContinue = () => go(s.phase === 'over' ? 'debrief' : 'table');
  } else if (campaign) {
    continueLabel = campaignFinished(campaign) ? 'Campaign complete' : `Campaign · Day ${campaign.day}`;
    onContinue = () => go('campaign');
  }

  const newCampaign = () => {
    if (campaign && !campaignFinished(campaign)) setConfirmNew(true);
    else startCampaign();
  };

  return (
    <div className="title-screen">
      <main className="title-screen__main" id="main">
        <h1 className="title-screen__logo">
          <Logo variant="mark" size="7rem" />
          <span className="title-screen__word">Indigo Storm</span>
        </h1>
        <p className="title-screen__tag">A solo, episodic conspiracy-thriller card game.</p>
        <nav className="title-menu" aria-label="Main menu">
          <Button
            variant="primary"
            size="lg"
            block
            disabled={!onContinue}
            onClick={() => onContinue?.()}
            icon={<UiIcon name="play" />}
            autoFocus={!!onContinue}
          >
            Continue
          </Button>
          {continueLabel && <p className="title-menu__sub">{continueLabel}</p>}
          <Button size="lg" block onClick={newCampaign}>
            New campaign
          </Button>
          <Button size="lg" block onClick={() => go('days')} autoFocus={!onContinue}>
            Prototype days
          </Button>
          <div className="title-menu__row">
            <Button block variant="ghost" onClick={() => go('howto')}>
              How to play
            </Button>
            <Button block variant="ghost" onClick={() => go('rulebook')} icon={<UiIcon name="book" />}>
              Rulebook
            </Button>
          </div>
          <div className="title-menu__row">
            <Button block variant="ghost" onClick={() => go('settings')}>
              Settings
            </Button>
            <Button block variant="ghost" onClick={() => go('saves')}>
              Import / export
            </Button>
          </div>
        </nav>
      </main>
      <footer className="title-screen__foot">
        <span>Prototype build · data {gameData.version.slice(0, 8)}</span>
        <span>Runs entirely in your browser. Progress is saved on this device.</span>
      </footer>
      <Dialog
        open={confirmNew}
        onClose={() => setConfirmNew(false)}
        title="Start a new campaign?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmNew(false)}>
              Keep my campaign
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setConfirmNew(false);
                startCampaign();
              }}
            >
              Start over
            </Button>
          </>
        }
      >
        <p>Your current campaign (Day {campaign?.day}) will be replaced. Export a save first if you want to keep it.</p>
      </Dialog>
    </div>
  );
}
