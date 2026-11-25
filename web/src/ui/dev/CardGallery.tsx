import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { dayPlan, gameData } from '../../data/index.ts';
import type { CardDay, PlayerCard, ThreatCard } from '../../data/types.ts';
import {
  ActIllustration,
  BACKS,
  type BackKind,
  DieFace,
  DrawIcon,
  ExposureIcon,
  LeadIcon,
  Logo,
  PerkEmblem,
  Pip,
  StarIcon,
  SuitIcon,
  ThreatGlyph,
  UiIcon,
  type UiIconName,
} from '../art/index.ts';
import {
  CardBack,
  CardInspect,
  type CardSize,
  JumpInView,
  PlayerCardView,
  playerCardSummary,
  RuleCardView,
  StoryCardView,
  SuitChip,
  ThreatCardView,
  threatCardSummary,
} from '../cards/index.ts';
import {
  Badge,
  Button,
  Dialog,
  IconButton,
  Kbd,
  LiveRegion,
  Segmented,
  SideSheet,
  StarRow,
  Switch,
  Tabs,
  ToastProvider,
  Tooltip,
  Track,
  useToast,
} from '../components/index.ts';
import './gallery.css';

type Theme = 'system' | 'dark' | 'light' | 'contrast';
type Motion = 'system' | 'full' | 'reduced';

const SPOILERS = gameData.storySource === 'spoilers';

function readParam(name: string): string | null {
  const m = new RegExp(`[#&?]${name}=([^&]+)`).exec(location.hash);
  return m?.[1] ?? null;
}

function dayKey(d: CardDay): string {
  return d === 'CORE' ? 'Core deck' : d === 'PROTO' ? 'Prototype stand-ins' : `Day ${d}`;
}

function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = m.get(k);
    if (list) list.push(it);
    else m.set(k, [it]);
  }
  return [...m.entries()];
}

function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="gal-section" aria-labelledby={`${id}-h`}>
      <header className="gal-section__head">
        <h2 id={`${id}-h`}>{title}</h2>
        {intro && <p>{intro}</p>}
      </header>
      {children}
    </section>
  );
}

function Specimen({ caption, children, wide }: { caption: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <figure className="gal-specimen" data-wide={wide || undefined}>
      <div className="gal-specimen__stage">{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

type Inspectable = { kind: 'player'; card: PlayerCard } | { kind: 'threat'; card: ThreatCard };

/* ------------------------------------------------------------------ foundations */

const SWATCHES: [string, string, string][] = [
  ['Night', '--night-900', '#0B0D24'],
  ['Storm indigo', '--bg-storm', '#241F63'],
  ['Dossier paper', '--paper', '#F6F7FB'],
  ['Print ink', '--ink', '#1D2433'],
  ['Electric cyan', '--cyan-400', '#3DE3F5'],
  ['Signal gold', '--gold-400', '#F2C063'],
];
const SUIT_SWATCHES: [string, string, string, string][] = [
  ['Recon', '--suit-recon-base', '--suit-recon-hc', '--suit-recon-bright'],
  ['Stealth', '--suit-stealth-base', '--suit-stealth-hc', '--suit-stealth-bright'],
  ['Force', '--suit-force-base', '--suit-force-hc', '--suit-force-bright'],
];
const TYPE_SWATCHES: [string, string][] = [
  ['Threat', '--type-threat'],
  ['Encrypted', '--type-encrypted'],
  ['Pursuer', '--type-pursuer'],
  ['Two-phase', '--type-twophase'],
  ['Countermeasure', '--type-countermeasure'],
  ['Gear', '--type-gear'],
  ['Ally', '--type-ally'],
  ['Rule', '--type-rule'],
  ['Story', '--type-story'],
  ['Jump-in', '--type-jumpin'],
];
const UI_ICONS: UiIconName[] = [
  'close',
  'chevron-left',
  'chevron-right',
  'flip',
  'info',
  'check',
  'zoom',
  'sun',
  'moon',
  'contrast',
  'menu',
  'book',
  'play',
];

function Foundations() {
  const actTitle = (act: 1 | 2 | 3) => gameData.days.find((d) => d.act === act)?.actTitle ?? '';
  return (
    <>
      <Section
        id="brand"
        title="Brand"
        intro="Wordmark and mark. The storm-eye isobars are the system’s signature motif: they reappear in the page texture, every card back and the act scenes."
      >
        <div className="gal-row gal-row--center">
          <Logo size="22em" />
          <Logo variant="stacked" size="10em" />
          <Logo variant="mark" size="5em" />
          <Logo variant="mark" size="2em" />
        </div>
        <div className="gal-acts">
          {([1, 2, 3] as const).map((a) => (
            <figure key={a} className="gal-act">
              <ActIllustration act={a} title={`Act ${a}: ${actTitle(a)}`} />
              <figcaption>
                <span className="gal-act__num">Act {['I', 'II', 'III'][a - 1]}</span>
                <span className="gal-act__title">{actTitle(a)}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section
        id="color"
        title="Color"
        intro="Suit colors are always paired with a shape (eye, crescent, bolt). High-contrast variants swap in with the contrast theme or data-suits='hc'; bright variants are for icons on the night background."
      >
        <div className="gal-swatches">
          {SWATCHES.map(([name, v, hex]) => (
            <div key={v} className="gal-swatch">
              <span className="gal-swatch__chip" style={{ background: `var(${v})` }} />
              <span className="gal-swatch__name">{name}</span>
              <code>{v}</code>
              <span className="gal-swatch__hex">{hex}</span>
            </div>
          ))}
        </div>
        <div className="gal-suits">
          {SUIT_SWATCHES.map(([name, base, hc, bright]) => (
            <div key={name} className="gal-suit">
              <span className="gal-suit__icon" style={{ color: `var(${bright})` }}>
                <SuitIcon suit={name as 'Recon'} title={name} />
              </span>
              <span className="gal-suit__name">{name}</span>
              <span className="gal-suit__chips">
                <span style={{ background: `var(${base})` }}>
                  <SuitIcon suit={name as 'Recon'} /> base
                </span>
                <span style={{ background: `var(${hc})` }}>
                  <SuitIcon suit={name as 'Recon'} /> high contrast
                </span>
                <span
                  style={{
                    background: 'var(--night-900)',
                    color: `var(${bright})`,
                    boxShadow: `inset 0 0 0 1px var(${bright})`,
                  }}
                >
                  <SuitIcon suit={name as 'Recon'} /> bright
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="gal-types">
          {TYPE_SWATCHES.map(([name, v]) => (
            <span key={v} className="gal-type" style={{ background: `var(${v})` }}>
              {name}
            </span>
          ))}
        </div>
      </Section>

      <Section
        id="type"
        title="Type"
        intro="Oswald (condensed caps) for names, numbers and headings; Inter for everything you read."
      >
        <div className="gal-type-scale">
          <p className="display" style={{ fontSize: 'var(--fs-4xl)' }}>
            Burn notice
          </p>
          <p className="display" style={{ fontSize: 'var(--fs-2xl)' }}>
            Hunter-Killer Team
          </p>
          <p className="display" style={{ fontSize: 'var(--fs-lg)', color: 'var(--text-muted)' }}>
            Day 21 · Turn 3 of 8
          </p>
          <p style={{ fontSize: 'var(--fs-lg)', maxWidth: '60ch' }}>
            You wake in a locked room with no memory. Get out quietly — every Threat you leave in the Scene Row raises
            the heat.
          </p>
          <p style={{ color: 'var(--text-muted)', maxWidth: '64ch' }}>
            Body text is Inter at 16px with a 1.5 line height. Card text is set in container units so it scales with the
            card: about 11px on a medium card, 21px in the inspect view.
          </p>
        </div>
      </Section>

      <Section
        id="icons"
        title="Icons"
        intro="Inline SVG, drawn in currentColor. Every glyph has a distinct silhouette."
      >
        <div className="gal-icon-groups">
          <div className="gal-icon-group">
            <h3>Suits</h3>
            <div className="gal-icons">
              {(['Recon', 'Stealth', 'Force'] as const).map((s) => (
                <span key={s} className="gal-icon" style={{ color: `var(--suit-${s.toLowerCase()}-bright)` }}>
                  <SuitIcon suit={s} title={s} size={40} />
                  <small>{s}</small>
                </span>
              ))}
              {(['Recon', 'Stealth', 'Force'] as const).map((s) => (
                <span key={`chip${s}`} className="gal-icon" style={{ fontSize: 28 }}>
                  <SuitChip suit={s} />
                  <small>chip</small>
                </span>
              ))}
              <span className="gal-icon" style={{ fontSize: 28 }}>
                <SuitChip suit="Force" hollow />
                <small>unmet</small>
              </span>
            </div>
          </div>
          <div className="gal-icon-group">
            <h3>Threat types</h3>
            <div className="gal-icons">
              {(
                [
                  ['threat', 'Threat'],
                  ['encrypted', 'Encrypted'],
                  ['pursuer', 'Pursuer'],
                  ['twophase', 'Two-phase'],
                  ['countermeasure', 'Countermeasure'],
                  ['blocker', 'Blocker'],
                ] as const
              ).map(([k, label]) => (
                <span key={k} className="gal-icon">
                  <span
                    className="gal-badge-disc"
                    style={{ background: `var(--type-${k === 'blocker' ? 'threat' : k})` }}
                  >
                    <ThreatGlyph
                      kind={k}
                      title={label}
                      size={26}
                      style={{ ['--glyph-cut' as string]: `var(--type-${k})` }}
                    />
                  </span>
                  <small>{label}</small>
                </span>
              ))}
            </div>
          </div>
          <div className="gal-icon-group">
            <h3>Perk branches</h3>
            <div className="gal-icons">
              {(
                [
                  ['GHOST', 'var(--suit-stealth-bright)'],
                  ['ANALYST', 'var(--suit-recon-bright)'],
                  ['OPERATIVE', 'var(--suit-force-bright)'],
                ] as const
              ).map(([b, c]) => (
                <span key={b} className="gal-icon" style={{ color: c }}>
                  <PerkEmblem branch={b} title={b} size={48} />
                  <small>{b}</small>
                </span>
              ))}
            </div>
          </div>
          <div className="gal-icon-group">
            <h3>Stars, pips, tracks</h3>
            <div className="gal-icons">
              <span className="gal-icon" style={{ color: 'var(--star)' }}>
                <StarIcon filled title="Star earned" size={36} />
                <small>earned</small>
              </span>
              <span className="gal-icon" style={{ color: 'var(--text-faint)' }}>
                <StarIcon title="Star not earned" size={36} />
                <small>open</small>
              </span>
              {(['empty', 'filled', 'target', 'threshold', 'redline'] as const).map((p) => (
                <span
                  key={p}
                  className="gal-icon"
                  style={{ color: p === 'redline' ? 'var(--exposure)' : 'var(--lead-bright)' }}
                >
                  <Pip state={p} title={p} size={22} />
                  <small>{p}</small>
                </span>
              ))}
              <span className="gal-icon" style={{ color: 'var(--lead-bright)' }}>
                <LeadIcon title="Lead" size={30} />
                <small>Lead</small>
              </span>
              <span className="gal-icon" style={{ color: 'var(--exposure-bright)' }}>
                <ExposureIcon title="Exposure" size={30} />
                <small>Exposure</small>
              </span>
              <span className="gal-icon">
                <DrawIcon title="Draw" size={30} />
                <small>Draw</small>
              </span>
            </div>
          </div>
          <div className="gal-icon-group">
            <h3>Dice</h3>
            <div className="gal-icons">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <span key={`t${v}`} className="gal-icon">
                  <DieFace value={v} size={40} />
                  <small>timer {v}</small>
                </span>
              ))}
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <span key={`h${v}`} className="gal-icon">
                  <DieFace value={v} variant="hunt" size={40} />
                  <small>hunt {v}</small>
                </span>
              ))}
              <span className="gal-icon">
                <DieFace value={0} size={40} />
                <small>0</small>
              </span>
              <span className="gal-icon">
                <DieFace value={7} size={40} />
                <small>stalled 7</small>
              </span>
            </div>
          </div>
          <div className="gal-icon-group">
            <h3>Interface</h3>
            <div className="gal-icons">
              {UI_ICONS.map((n) => (
                <span key={n} className="gal-icon">
                  <UiIcon name={n} title={n} size={24} />
                  <small>{n}</small>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ components demo */

function ComponentsDemo() {
  const toast = useToast();
  const [lead, setLead] = useState(4);
  const [exposure, setExposure] = useState(2);
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [announce, setAnnounce] = useState('');
  const [starsKey, setStarsKey] = useState(0);
  return (
    <Section
      id="components"
      title="Components"
      intro="Buttons, tracks, Stars, prompts and feedback. All keyboard-operable with visible focus."
    >
      <div className="gal-panels">
        <div className="gal-panel">
          <h3>Buttons</h3>
          <div className="gal-row">
            <Button variant="primary" icon={<UiIcon name="play" />}>
              Begin episode
            </Button>
            <Button variant="secondary">Rulebook</Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="danger">Reset data</Button>
          </div>
          <div className="gal-row">
            <Button variant="primary" size="lg" kbd="Enter">
              End plays
            </Button>
            <Button variant="secondary" size="sm" kbd="R">
              Rules
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <IconButton label="Inspect card" icon={<UiIcon name="zoom" />} />
            <IconButton label="Open menu" icon={<UiIcon name="menu" />} variant="secondary" />
            <IconButton label="Close" icon={<UiIcon name="close" />} size="sm" />
          </div>
        </div>

        <div className="gal-panel">
          <h3>Badges, keys, tooltip, switch</h3>
          <div className="gal-row">
            <Badge tone="recon" icon={<SuitIcon suit="Recon" />}>
              Recon
            </Badge>
            <Badge tone="stealth" icon={<SuitIcon suit="Stealth" />}>
              Stealth
            </Badge>
            <Badge tone="force" icon={<SuitIcon suit="Force" />} solid>
              Force
            </Badge>
            <Badge tone="lead" icon={<LeadIcon />}>
              +2 Lead
            </Badge>
            <Badge tone="exposure" icon={<ExposureIcon />}>
              +1 Exposure
            </Badge>
            <Badge tone="success" icon={<UiIcon name="check" />}>
              Clean
            </Badge>
            <Badge tone="warning">Perk used</Badge>
            <Badge>Day 6</Badge>
          </div>
          <div className="gal-row">
            <span className="gal-text">
              Select card <Kbd>1</Kbd>–<Kbd>6</Kbd>, target <Kbd>←</Kbd> <Kbd>→</Kbd>, confirm <Kbd>Enter</Kbd>,
              shortcuts <Kbd keys={['Shift', '?']} />
            </span>
          </div>
          <div className="gal-row">
            <Tooltip content="Discard a face-up Threat without clearing it. Once per episode.">
              <Button variant="secondary" icon={<PerkEmblem branch="GHOST" />}>
                Vanish
              </Button>
            </Tooltip>
            <Switch
              checked={on}
              onChange={setOn}
              label="Confirm before ending plays"
              description="Ask before the Pressure step starts."
            />
          </div>
          <div className="gal-row">
            <Segmented
              label="Animation speed"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'slow', label: 'Slow' },
                { value: 'normal', label: 'Normal' },
                { value: 'fast', label: 'Fast' },
              ]}
            />
          </div>
        </div>

        <div className="gal-panel gal-panel--wide">
          <h3>Tracks</h3>
          <div className="gal-tracks">
            <Track kind="lead" value={lead} max={8} target={8} />
            <Track kind="exposure" value={exposure} max={6} threshold={2} redline={6} />
          </div>
          <div className="gal-row">
            <Button size="sm" onClick={() => setLead((v) => Math.min(8, v + 1))}>
              +1 Lead
            </Button>
            <Button size="sm" onClick={() => setLead((v) => Math.max(0, v - 1))}>
              −1 Lead
            </Button>
            <Button size="sm" onClick={() => setExposure((v) => Math.min(6, v + 1))}>
              +1 Exposure
            </Button>
            <Button size="sm" onClick={() => setExposure((v) => Math.max(0, v - 1))}>
              −1 Exposure
            </Button>
          </div>
          <div className="gal-tracks">
            <Track kind="lead" value={lead} max={8} target={8} compact />
            <Track kind="exposure" value={exposure} max={6} threshold={2} redline={6} compact />
          </div>
        </div>

        <div className="gal-panel">
          <h3>Stars</h3>
          <div className="gal-row">
            <StarRow earned={0} size="sm" />
            <StarRow earned={2} />
            <StarRow earned={3} size="lg" key={starsKey} animate />
            <Button size="sm" variant="ghost" onClick={() => setStarsKey((k) => k + 1)}>
              Replay
            </Button>
          </div>
          <StarRow
            showLabels
            stars={[
              { label: 'Objective', detail: 'Reach 8 Lead', earned: true },
              { label: 'Cover', detail: 'Finish at Exposure 2 or less', earned: false },
              { label: 'Bonus', detail: 'Neutralize the Pursuer.', earned: true },
            ]}
          />
        </div>

        <div className="gal-panel">
          <h3>Dialog, side sheet, toasts</h3>
          <div className="gal-row">
            <Button onClick={() => setDialog(true)}>Open dialog</Button>
            <Button onClick={() => setSheet(true)}>Ally Cover prompt</Button>
          </div>
          <div className="gal-row">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                toast.push({ message: 'Locked Door cleared. +1 Lead.', tone: 'success', title: 'Clean Clear' })
              }
            >
              Success toast
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast.push({ message: 'Fire Alarm escaped. +2 Exposure.', tone: 'danger' })}
            >
              Danger toast
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => toast.push({ message: 'Saved to this browser.', tone: 'info' })}
            >
              Info toast
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAnnounce(`Announced at ${new Date().toLocaleTimeString()}`)}
            >
              Announce (screen reader)
            </Button>
            <LiveRegion message={announce} />
          </div>
        </div>

        <div className="gal-panel gal-panel--wide">
          <h3>Tabs</h3>
          <Tabs
            label="Rulebook sections"
            items={[
              {
                id: 'basics',
                label: 'Basics',
                content: (
                  <p className="gal-text">Play exactly 2 cards each turn, then resolve Pressure, then draw 2.</p>
                ),
              },
              {
                id: 'threats',
                label: 'Threats',
                content: (
                  <p className="gal-text">Each Threat needs symbols of its preferred suit plus a Power total.</p>
                ),
              },
              {
                id: 'perks',
                label: 'Perks',
                content: <p className="gal-text">Every perk can be used once per episode.</p>,
              },
              { id: 'locked', label: 'Day 30', content: null, disabled: true },
            ]}
          />
        </div>
      </div>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        title="End your plays?"
        description="You still have 1 play left this turn. Ending now moves to the Pressure step."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              Keep playing
            </Button>
            <Button variant="primary" onClick={() => setDialog(false)}>
              End plays
            </Button>
          </>
        }
      >
        <p className="gal-text">
          Focus is trapped inside, Escape closes, and focus returns to the button that opened it.
        </p>
      </Dialog>
      <SideSheet
        open={sheet}
        onDismiss={() => setSheet(false)}
        context="Pressure step, slot 2"
        title="Use Ally Cover?"
        actions={
          <>
            <Button variant="primary" onClick={() => setSheet(false)}>
              Defeat The Fixer
            </Button>
            <Button variant="secondary" onClick={() => setSheet(false)}>
              Let it resolve
            </Button>
          </>
        }
      >
        <p>
          <strong style={{ color: 'var(--text)' }}>Fire Alarm</strong> will apply its Pressure:{' '}
          <Badge tone="exposure">+1 Exposure</Badge>
        </p>
        <p style={{ marginTop: 8 }}>
          Defeat an Ally to cancel this one effect. The Ally returns to your deck after the episode.
        </p>
      </SideSheet>
    </Section>
  );
}

/* ------------------------------------------------------------------ gallery */

function GalleryBody() {
  const [theme, setTheme] = useState<Theme>((readParam('theme') as Theme | null) ?? 'system');
  const [motion, setMotion] = useState<Motion>((readParam('motion') as Motion | null) ?? 'system');
  const [size, setSize] = useState<CardSize>((readParam('size') as CardSize | null) ?? 'md');
  const [inspect, setInspect] = useState<Inspectable | null>(null);
  // `#gallery&only=threats` renders a single section (for focused review and screenshots).
  const only = readParam('only');
  const [selected, setSelected] = useState<string | null>('CORE-06');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;
    if (motion === 'system') delete root.dataset.motion;
    else root.dataset.motion = motion;
  }, [theme, motion]);

  // `#gallery&section=threats` jumps to a section on load (handy for screenshots and links).
  useEffect(() => {
    const section = readParam('section');
    if (section) document.getElementById(section)?.scrollIntoView();
  }, []);

  const playerGroups = useMemo(() => groupBy(gameData.playerCards, (c) => dayKey(c.day)), []);
  const threatGroups = useMemo(() => groupBy(gameData.threats, (t) => dayKey(t.day)), []);
  const t = (id: string) => gameData.threats.find((x) => x.id === id) as ThreatCard;
  const p = (id: string) => gameData.playerCards.find((x) => x.id === id) as PlayerCard;
  const pursuer = gameData.threats.find((x) => x.type === 'Pursuer');
  const encrypted = gameData.threats.find((x) => x.type === 'Encrypted Threat');
  const timed = gameData.threats.find((x) => x.timer !== null && x.type === 'Threat');
  const twoPhase = gameData.threats.find((x) => x.type === 'Two-Phase Threat');
  const firstThreat = gameData.threats[0] as ThreatCard;
  const blockerSample: ThreatCard = {
    ...t('D06-T05'),
    id: 'SAMPLE-B',
    name: 'Armed Overwatch',
    blocker: true,
    timer: null,
  };

  return (
    <div className="gallery">
      <header className="gal-top">
        <div className="gal-top__brand">
          <Logo variant="mark" size="2.2em" />
          <div>
            <h1>Card gallery</h1>
            <p>
              {gameData.playerCards.length} player cards, {gameData.threats.length} Threats, {gameData.rules.length}{' '}
              Rule cards. Data {gameData.version}.
            </p>
          </div>
        </div>
        <div className="gal-top__controls">
          <Segmented
            label="Theme"
            size="sm"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'dark', label: 'Dark', icon: <UiIcon name="moon" /> },
              { value: 'light', label: 'Light', icon: <UiIcon name="sun" /> },
              { value: 'contrast', label: 'High contrast', icon: <UiIcon name="contrast" /> },
            ]}
          />
          <Segmented
            label="Motion"
            size="sm"
            value={motion}
            onChange={setMotion}
            options={[
              { value: 'system', label: 'System motion' },
              { value: 'full', label: 'Full' },
              { value: 'reduced', label: 'Reduced' },
            ]}
          />
          <Segmented
            label="Card size"
            size="sm"
            value={size}
            onChange={setSize}
            options={(['sm', 'md', 'lg', 'xl'] as const).map((s) => ({ value: s, label: s.toUpperCase() }))}
          />
        </div>
        <nav className="gal-nav" aria-label="Gallery sections">
          {[
            ['brand', 'Brand'],
            ['color', 'Color'],
            ['icons', 'Icons'],
            ['player', 'Player cards'],
            ['threats', 'Threats'],
            ['states', 'States'],
            ['sizes', 'Sizes'],
            ['backs', 'Backs'],
            ['rules', 'Rules'],
            ['story', 'Story & jump-in'],
            ['components', 'Components'],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#gallery&${id}`}
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById(id as string)
                  ?.scrollIntoView({ behavior: motion === 'reduced' ? 'auto' : 'smooth' });
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main className="gal-main" data-only={only ?? undefined}>
        {only && <style>{`.gal-main[data-only] .gal-section:not(#${CSS.escape(only)}) { display: none; }`}</style>}
        <Foundations />

        <Section
          id="player"
          title="Player cards"
          intro="Click any card to inspect it. Grouped by where the card is stored."
        >
          {playerGroups.map(([group, cards]) => (
            <div key={group} className="gal-group">
              <h3>{group}</h3>
              <div className="gal-cards" data-size={size}>
                {cards.map((c) => (
                  <PlayerCardView
                    key={c.id}
                    card={c}
                    size={size}
                    hideFlashback={SPOILERS}
                    onClick={() => setInspect({ kind: 'player', card: c })}
                  />
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section
          id="threats"
          title="Threats"
          intro="Header color and badge show the Threat type; the requirement panel shows preferred-suit symbols and Power."
        >
          {threatGroups.map(([group, cards]) => (
            <div key={group} className="gal-group">
              <h3>{group}</h3>
              <div className="gal-cards" data-size={size}>
                {cards.map((c) => (
                  <ThreatCardView
                    key={c.id}
                    card={c}
                    size={size}
                    onClick={() => setInspect({ kind: 'threat', card: c })}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="gal-group">
            <h3>Sample: Blocker (not in current data)</h3>
            <div className="gal-cards" data-size={size}>
              <ThreatCardView card={blockerSample} size={size} />
            </div>
          </div>
        </Section>

        <Section
          id="states"
          title="States"
          intro="Live table overlays and interaction states. Hover lifts interactive cards; selection adds a cyan glow, a check and a lift; legal targets get a dashed pulsing outline."
        >
          <div className="gal-specimens">
            <Specimen caption="Hand card, selectable (click to toggle)">
              <PlayerCardView
                card={p('CORE-06')}
                selected={selected === 'CORE-06'}
                onClick={() => setSelected((s) => (s === 'CORE-06' ? null : 'CORE-06'))}
              />
            </Specimen>
            <Specimen caption="Hand card, not selected">
              <PlayerCardView
                card={p('CORE-11')}
                selected={selected === 'CORE-11'}
                onClick={() => setSelected((s) => (s === 'CORE-11' ? null : 'CORE-11'))}
              />
            </Specimen>
            <Specimen caption="Disabled (still focusable)">
              <PlayerCardView card={p('CORE-02')} disabled onClick={() => undefined} />
            </Specimen>
            <Specimen caption="Dimmed">
              <PlayerCardView card={p('CORE-09')} dimmed />
            </Specimen>
            <Specimen caption="Legal target, progress 1 of 2 symbols, 3/6 Power">
              <ThreatCardView
                card={t('D01-T04')}
                highlighted
                onClick={() => undefined}
                progress={{ symbols: 1, symbolsNeeded: 2, power: 3, powerNeeded: t('D01-T04').power }}
                tuckedCount={1}
              />
            </Specimen>
            <Specimen caption="Ready to clear, Clean">
              <ThreatCardView
                card={firstThreat}
                progress={{
                  symbols: firstThreat.symbols,
                  symbolsNeeded: firstThreat.symbols,
                  power: firstThreat.power + 1,
                  powerNeeded: firstThreat.power,
                  wouldBeClean: true,
                }}
                tuckedCount={2}
              />
            </Specimen>
            {timed && (
              <Specimen caption="Timer die at 1">
                <ThreatCardView card={timed} die={1} />
              </Specimen>
            )}
            <Specimen caption="Pressure cancelled this turn">
              <ThreatCardView card={t('D01-T07')} cancelled />
            </Specimen>
            {pursuer && (
              <Specimen caption="Pursuer with Hunt die, 3 tucked">
                <ThreatCardView
                  card={pursuer}
                  die={2}
                  tuckedCount={3}
                  progress={{ symbols: 2, symbolsNeeded: pursuer.symbols, power: 7, powerNeeded: pursuer.power }}
                />
              </Specimen>
            )}
            {encrypted && (
              <Specimen caption="Encrypted, face-down (legal decrypt target)">
                <ThreatCardView card={encrypted} faceDown highlighted onClick={() => undefined} />
              </Specimen>
            )}
            {twoPhase && (
              <Specimen caption="Two-phase, selected">
                <ThreatCardView card={twoPhase} selected onClick={() => undefined} />
              </Specimen>
            )}
            <Specimen caption="Threat deck with count">
              <CardBack kind="threat" count={7} />
            </Specimen>
          </div>
        </Section>

        <Section
          id="sizes"
          title="Sizes"
          intro="xs and sm are glanceable minis (tucked cards, deck piles, logs): text drops out, numbers and shapes grow. md is the table default; lg suits reading cards; xl is the inspect view."
        >
          {(['player', 'threat'] as const).map((kind) => (
            <div key={kind} className="gal-sizes">
              {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <Specimen key={s} caption={s}>
                  {kind === 'player' ? (
                    <PlayerCardView card={p('D16-P1')} size={s} />
                  ) : (
                    <ThreatCardView card={pursuer ?? firstThreat} size={s} die={3} />
                  )}
                </Specimen>
              ))}
            </div>
          ))}
          <div className="gal-sizes">
            {(['xs', 'sm', 'md'] as const).map((s) => (
              <Specimen key={s} caption={s}>
                <CardBack kind="operative" size={s} />
              </Specimen>
            ))}
            {(['xs', 'sm', 'md'] as const).map((s) => (
              <Specimen key={`g${s}`} caption={`${s} gear / ally`}>
                <div className="gal-row">
                  <PlayerCardView card={p('D06-P1')} size={s} />
                  <PlayerCardView card={p('D21-P2')} size={s} />
                </div>
              </Specimen>
            ))}
          </div>
        </Section>

        <Section
          id="backs"
          title="Card backs"
          intro="One back per deck or role, matching the print backs. Each has its own storm and emblem so you can tell piles apart at a glance."
        >
          <div className="gal-cards" data-size={size}>
            {(Object.keys(BACKS) as BackKind[]).map((k) => (
              <Specimen key={k} caption={BACKS[k].label}>
                <CardBack kind={k} size={size} />
              </Specimen>
            ))}
          </div>
        </Section>

        <Section id="rules" title="Rule cards" intro="Double-sided. Use the button under a card to flip it.">
          <div className="gal-cards gal-cards--rules">
            {gameData.rules.map((r, i) => (
              <RuleCardView
                key={r.id}
                rule={r}
                size={size === 'sm' || size === 'md' ? 'lg' : size}
                defaultSide={i === 1 ? 'back' : 'front'}
              />
            ))}
          </div>
        </Section>

        <Section
          id="story"
          title="Story and jump-in"
          intro={
            SPOILERS
              ? 'Real story text is present (spoilers/). It is hidden here so the campaign stays a surprise.'
              : 'Placeholder story text. Intro cards add the day’s setup and Star conditions.'
          }
        >
          {!SPOILERS && (
            <div className="gal-cards gal-cards--rules">
              {gameData.story.map((s) => (
                <StoryCardView
                  key={s.id}
                  story={s}
                  plan={dayPlan(s.day)}
                  hasPursuer={gameData.threats.some((x) => x.day === s.day && x.type === 'Pursuer')}
                  size={size === 'sm' || size === 'md' ? 'lg' : size}
                />
              ))}
            </div>
          )}
          <div className="gal-cards gal-cards--rules">
            {gameData.jumpIns.map((j) => (
              <JumpInView key={j.day} jumpIn={j} size={size === 'sm' || size === 'md' ? 'lg' : size} />
            ))}
          </div>
        </Section>

        <ComponentsDemo />
      </main>

      <CardInspect
        open={inspect !== null}
        onClose={() => setInspect(null)}
        title={inspect?.card.name ?? ''}
        text={
          inspect &&
          (inspect.kind === 'player' ? playerCardSummary(inspect.card) : threatCardSummary(inspect.card))
            .split(/(?<=\.)\s+/)
            .map((line) => <p key={line}>{line}</p>)
        }
        actions={
          <Button variant="primary" onClick={() => setInspect(null)}>
            Done
          </Button>
        }
      >
        {inspect?.kind === 'player' && <PlayerCardView card={inspect.card} size="xl" hideFlashback={SPOILERS} />}
        {inspect?.kind === 'threat' && <ThreatCardView card={inspect.card} size="xl" />}
      </CardInspect>
    </div>
  );
}

/** Dev-only review page (#gallery): every card in the data, all backs, states, sizes and components. */
export function CardGallery() {
  return (
    <ToastProvider>
      <GalleryBody />
    </ToastProvider>
  );
}
