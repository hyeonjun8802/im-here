/* v116: display-only mode for the Black Map's contextual actions.
 * Existing scenario buttons and rewards are never modified. */
export const BLACK_MAP_VISIBLE_BUTTON_LIMIT=3;
export function blackMapCompactMode({preparing=false,report=false,missionPhase='',finaleReady=false}={}){
 if(preparing)return 'preparing';
 if(report)return 'return';
 if(missionPhase==='encounter')return 'encounter';
 if(missionPhase)return 'travel';
 if(finaleReady)return 'finale';
 return 'normal';
}
