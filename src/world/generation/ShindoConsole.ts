/** Shared physical control positions, in metres. The panel sits inside the existing cabinet envelope. */
export type ShindoAction='previous'|'toggle'|'next';
export const SHINDO_CONTROLS:readonly {action:ShindoAction;x:number;label:string}[]=[
 {action:'previous',x:18.72,label:'Previous track'},
 {action:'toggle',x:18.94,label:'Play / pause'},
 {action:'next',x:19.16,label:'Next track'},
];
export const SHINDO_PANEL={yAboveFloor:.81,z:-40.012,width:.19,height:.085,reach:1.85} as const;
/** Ray distance is measured from the player's eye, with opaque geometry tested separately. */
export function canUseShindoControl(distance:number,occluderDistance=Infinity){
 return Number.isFinite(distance)&&distance>=0&&distance<=SHINDO_PANEL.reach&&occluderDistance>=distance-.008;
}
