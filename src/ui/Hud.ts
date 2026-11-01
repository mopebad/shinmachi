import { CityWorld } from '../world/CityWorld';

export class Hud {
  private readonly root = document.createElement('div');
  constructor(app: HTMLElement, private readonly world: CityWorld) {
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud__top">
        <div class="brand"><div class="brand__eyebrow">東京 / SHINMACHI</div><div class="brand__title">新町散歩</div><div class="brand__sub">A living neighborhood study</div></div>
        <div class="telemetry"><div><span class="label">Location</span><strong id="hud-location"></strong></div><div><span class="label">Local time</span><strong id="hud-time"></strong></div><div><span class="label">Explore</span><button id="hud-mode" class="mode" aria-label="Switch walk or fly mode">WALK</button></div></div>
      </div>
      <div class="controls"><div class="label">Explore Shinmachi</div>
        <div class="controls__row"><span>Click scene to look</span><kbd>ESC to release</kbd></div>
        <div class="controls__row"><span>Move · walk / fly</span><kbd>WASD · V / F</kbd></div>
        <div class="controls__row"><span>Fly up / down</span><kbd>SPACE / SHIFT</kbd></div>
        <div class="controls__row"><label for="location">Locations <kbd>1–5</kbd></label><select id="location"><option value="0">Commercial street</option><option value="1">Lantern alley</option><option value="2">Station square</option><option value="3">District overview</option><option value="4">Residential lane</option></select></div>
        <div class="controls__row"><label for="cycle">Time of day</label><input class="cycle" id="cycle" type="range" min="0" max="23.99" step="0.01" value="17.25" /></div>
        <div class="controls__row"><span>Day / night cycle</span><button id="play" aria-pressed="false">▶ Play</button></div>
        <div class="controls__row"><span>City sound <kbd>M</kbd></span><button id="sound" aria-pressed="false">Enable sound</button></div>
        <div class="controls__row"><label for="volume">Volume</label><input class="cycle" id="volume" type="range" min="0" max="1" step="0.01" value="0.42" /></div>
        <div class="stats" id="stats"></div>
      </div>`;
    app.appendChild(this.root);
    this.root.querySelector<HTMLInputElement>('#cycle')!.addEventListener('input', e => world.setTime(Number((e.target as HTMLInputElement).value)));
    this.root.querySelector<HTMLSelectElement>('#location')!.addEventListener('change', e => world.teleport(Number((e.target as HTMLSelectElement).value)));
    this.root.querySelector('#hud-mode')!.addEventListener('click', () => world.controller.setMode(world.cameraMode === 'walk' ? 'fly' : 'walk'));
    this.root.querySelector('#play')!.addEventListener('click', () => world.setPlaying(!world.playing));
    this.root.querySelector('#sound')!.addEventListener('click', () => world.audio.toggle());
    this.root.querySelector<HTMLInputElement>('#volume')!.addEventListener('input', e => world.audio.setVolume(Number((e.target as HTMLInputElement).value)));
    window.addEventListener('keydown', e => { if (e.target instanceof HTMLElement && e.target.matches('input,select,button')) return; if (/^[1-5]$/.test(e.key)) { world.teleport(Number(e.key) - 1); this.root.querySelector<HTMLSelectElement>('#location')!.value = String(Number(e.key) - 1); } });
    window.addEventListener('keydown', e => { if (!e.repeat && e.key.toLowerCase() === 'm' && !(e.target instanceof HTMLElement && e.target.matches('input,select,button'))) world.audio.toggle(); });
  }
  start(): void {
    const update = () => {
      this.root.querySelector('#hud-mode')!.textContent = this.world.cameraMode.toUpperCase();
      const minutes = Math.floor(this.world.time * 60 + .0001);
      this.root.querySelector('#hud-time')!.textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      this.root.querySelector('#hud-location')!.textContent = this.world.locationName;
      if (document.activeElement?.id !== 'cycle') this.root.querySelector<HTMLInputElement>('#cycle')!.value = String(this.world.time);
      const play = this.root.querySelector<HTMLButtonElement>('#play')!; play.textContent = this.world.playing ? 'Ⅱ Pause' : '▶ Play'; play.setAttribute('aria-pressed', String(this.world.playing));
      const sound = this.root.querySelector<HTMLButtonElement>('#sound')!; sound.textContent = this.world.audio.status === 'start' ? 'Enable sound' : this.world.audio.status === 'on' ? 'Sound on' : 'Sound muted'; sound.setAttribute('aria-pressed', String(this.world.audio.status === 'on'));
      const s = this.world.stats;
      this.root.querySelector('#stats')!.textContent = `${s.fps} FPS · ${s.buildings} buildings · ${s.pedestrians} people · ${s.vehicles} cars`;
    };
    update(); window.setInterval(update, 250);
  }
}
