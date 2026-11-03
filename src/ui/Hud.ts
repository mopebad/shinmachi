import { CityWorld } from '../world/CityWorld';

export class Hud {
  private readonly root = document.createElement('div');
  private readonly restore = document.createElement('button');
  private hidden = false;
  constructor(app: HTMLElement, private readonly world: CityWorld) {
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud__top">
        <div class="brand"><span class="brand__mark">新町</span><div><div class="brand__eyebrow">SHINMACHI / TOKYO INSPIRED</div><div class="brand__sub">The city, after hours.</div></div></div>
        <div class="telemetry"><span class="live-dot"></span><strong id="hud-time"></strong><span class="telemetry__divider"></span><span id="hud-location"></span></div>
      </div>
      <div class="hud__bottom">
        <details class="controls" open><summary>Explore the neighborhood <span>−</span></summary><div class="controls__body">
          <label class="label" for="location">A different perspective <kbd>1–7</kbd></label>
          <select id="location"><option value="0">01 / Commercial street</option><option value="1">02 / Lantern alley</option><option value="2">03 / Shinmachi station</option><option value="3">04 / District overview</option><option value="4">05 / Residential lane</option><option value="5" selected>06 / Akane tower avenue</option><option value="6">07 / Railway approach</option></select>
          <div class="scene-presets" aria-label="Lighting presets"><button data-hour="20.5" class="active">After hours</button><button data-hour="18.4">Blue hour</button><button data-hour="13">Daylight</button></div>
          <div class="controls__row"><label for="cycle">Local time</label><input id="cycle" type="range" min="0" max="23.99" step="0.01" value="20.5"/><button id="play" aria-label="Play day and night cycle" aria-pressed="false">▶</button></div>
          <div class="controls__row"><label for="weather">Street surface</label><select id="weather"><option value="damp">After rain</option><option value="dry">Dry</option></select></div>
          <div class="controls__row"><label for="reflections">Road reflections</label><input id="reflections" type="checkbox" checked /></div>
          <div class="controls__row"><label for="fov">Lens <span id="lens-value">48°</span></label><input id="fov" type="range" min="35" max="80" step="1" value="48"/></div>
          <div class="controls__row controls__audio"><button id="sound" aria-pressed="false">Enable sound</button><label for="volume" class="sr-only">Sound volume</label><input id="volume" type="range" min="0" max="1" step="0.01" value="0.3" /></div>
          <div class="controls__footer"><button id="hud-mode" aria-label="Switch walk or fly mode">WALK</button><span id="stats"></span></div>
        </div></details>
        <div class="explore-hint"><span>Click to look · <kbd>WASD</kbd> to move · <kbd>ESC</kbd> to release</span><button id="photo">Hide controls <kbd>H</kbd></button></div>
      </div>`;
    this.restore.className = 'photo-restore'; this.restore.textContent = 'H / Show controls'; this.restore.hidden = true;
    app.append(this.root, this.restore);
    const on = (selector: string, event: string, listener: EventListener) => this.root.querySelector(selector)!.addEventListener(event, listener);
    on('#cycle', 'input', e => world.setTime(Number((e.target as HTMLInputElement).value)));
    on('#location', 'change', e => world.teleport(Number((e.target as HTMLSelectElement).value)));
    on('#weather', 'change', e => world.setWeather((e.target as HTMLSelectElement).value as 'dry' | 'damp'));
    on('#reflections', 'change', e => world.setReflections((e.target as HTMLInputElement).checked));
    on('#fov', 'input', e => world.setFov(Number((e.target as HTMLInputElement).value)));
    on('#hud-mode', 'click', () => world.controller.setMode(world.cameraMode === 'walk' ? 'fly' : 'walk'));
    on('#play', 'click', () => world.setPlaying(!world.playing));
    on('#sound', 'click', () => world.audio.toggle());
    on('#volume', 'input', e => world.audio.setVolume(Number((e.target as HTMLInputElement).value)));
    on('#photo', 'click', () => this.togglePhoto()); this.restore.addEventListener('click', () => this.togglePhoto());
    this.root.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(button => button.addEventListener('click', () => { world.setPlaying(false); world.setTime(Number(button.dataset.hour)); }));
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLElement && e.target.matches('input,select,textarea')) return;
      if (/^[1-7]$/.test(e.key)) world.teleport(Number(e.key) - 1);
      if (e.repeat) return; if (e.key.toLowerCase() === 'm') world.audio.toggle(); if (e.key.toLowerCase() === 'h') this.togglePhoto();
    });
  }
  private togglePhoto(): void { this.hidden = !this.hidden; this.root.hidden = this.hidden; this.restore.hidden = !this.hidden; }
  start(): void {
    const update = () => {
      const q = <T extends HTMLElement>(selector: string) => this.root.querySelector<T>(selector)!;
      q('#hud-mode').textContent = this.world.cameraMode.toUpperCase();
      const minutes = Math.floor(this.world.time * 60 + .0001); q('#hud-time').textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      q('#hud-location').textContent = this.world.locationName;
      if (document.activeElement?.id !== 'cycle') q<HTMLInputElement>('#cycle').value = String(this.world.time);
      if (document.activeElement?.id !== 'fov') q<HTMLInputElement>('#fov').value = String(this.world.camera.fov);
      if (document.activeElement?.id !== 'location') q<HTMLSelectElement>('#location').value = String(this.world.locationIndex);
      q('#lens-value').textContent = `${Math.round(this.world.camera.fov)}°`;
      const play = q<HTMLButtonElement>('#play'); play.textContent = this.world.playing ? 'Ⅱ' : '▶'; play.setAttribute('aria-pressed', String(this.world.playing));
      const sound = q<HTMLButtonElement>('#sound'); sound.textContent = this.world.audio.status === 'start' ? 'Enable sound' : this.world.audio.status === 'on' ? 'Sound on · M' : 'Sound muted · M'; sound.setAttribute('aria-pressed', String(this.world.audio.status === 'on'));
      this.root.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(b => b.classList.toggle('active', Math.abs(Number(b.dataset.hour) - this.world.time) < .1));
      const s = this.world.stats; q('#stats').textContent = `${s.fps} fps · ${s.pedestrians} people`;
    };
    update(); window.setInterval(update, 250);
  }
}
