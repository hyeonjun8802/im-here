/** AFTERDAY v95: keep repair scrap meaningful, not a 999-item hoard.
 * New rewards stop at a 12-part working reserve (tower 4 + four repairs 2 each).
 * Loaded/legacy inventory is NEVER reduced. No changes to medicine or odds.
 */
export const REPAIR_PARTS_RESERVE=12;
export function awardRepairParts(state,quantity){
 const supply=state?.supply;
 if(!supply)return 0;
 const current=Math.max(0,Math.floor(Number(supply.parts)||0));
 const requested=Math.max(0,Math.floor(Number(quantity)||0));
 const awarded=Math.min(requested,Math.max(0,REPAIR_PARTS_RESERVE-current));
 if(awarded>0)supply.parts=current+awarded;
 return awarded;
}
