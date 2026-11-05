import './style.css';
import { CityWorld } from './world/CityWorld';
import { Hud } from './ui/Hud';

declare global { interface Window { __shinmachi?: CityWorld } }

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root is missing');

export const world = new CityWorld(app);
if (import.meta.env.DEV) window.__shinmachi = world;
const hud = new Hud(app, world);
world.start();
hud.start();
if(import.meta.env.DEV&&new URLSearchParams(location.search).get('editor')==='1'){
 void import('./world/authoring/SceneEditor').then(async({SceneEditor})=>{await world.assetsReady;new SceneEditor(world);});
}
