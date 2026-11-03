/** AFTERDAY v4.1 survival director: one rooftop, one survivor, one real-time clock.
 * These are game-balance units, not medical or meteorological measurements.
 * All incidence rolls are made once per encounter from saved seeds, never per frame.
 */
export const SURVIVAL_BALANCE=Object.freeze({
  satietyDrainMinute:.050,
  hydrationDrainMinute:.064,
  heatHydrationMultiplier:1.38,
  coldSatietyMultiplier:1.14,
  lowVitalThreshold:12,
  lowVitalHealthLossMinute:.17,
  bothLowHealthLossMinute:.12,
  weakShelterHealthLossMinute:.025,
  healthyRestRecoveryMinute:.002,
  restCooldownMs:4*3600000,
  exploreCooldownMs:20*3600000,
  collectWaterCooldownMs:6*3600000,
  firstDaySafeUntilDay:2,
  tornado:Object.freeze({
    near:Object.freeze({food:2,water:1,health:13,shelter:12,storage:11}),
    direct:Object.freeze({food:4,water:2,health:27,shelter:28,storage:22}),
    coverHealthFactor:.31,
    coverShelterFactor:.80,
    secureFoodFactor:.25,
    secureWaterFactor:.5
  })
});
export const SURVIVAL_CHAPTERS=Object.freeze([
  {day:2,title:'첫 번째 빈 통',line:'첫날의 식량이 줄었다. 비가 와도 물은 그냥 마실 수 없다. 비축과 수리를 시작해야 한다.'},
  {day:3,title:'벽 너머의 바람',line:'도시 바깥의 소용돌이가 보인다. 대피와 식량 고정 중 무엇을 먼저 할지 결정해야 한다.'},
  {day:5,title:'다섯 번째 밤',line:'버티는 것만으로는 부족하다. 남은 약과 물자의 순서를 틀리면 내일은 없다.'},
  {day:7,title:'일주일의 흔적',line:'도시의 빛은 돌아오지 않았다. 옥상에 남은 도구를 고쳐 또 하루를 산다.'},
  {day:10,title:'물탱크의 금',line:'장기 생존은 운이 아니라 대비다. 비가 오면 물을 모으고 날이 맑으면 시설을 손본다.'},
  {day:15,title:'반쯤 살아남은 도시',line:'주변 건물은 더 무너졌다. 옥상은 여전히 하나이고 모든 식량에는 값이 붙는다.'},
  {day:20,title:'침묵하는 무전기',line:'응답은 없지만 아직 숨을 쉰다. 위협을 읽고 언제 움직일지 결정해야 한다.'},
  {day:30,title:'서른 번째 일출',line:'서른 번의 밤을 버텼다. 구조는 오지 않았지만 이곳을 지키는 법을 배웠다.'}
]);
export function survivalChapter(day){
  const chapter=[...SURVIVAL_CHAPTERS].reverse().find(x=>day>=x.day);
  return chapter||{day:1,title:'도시 위 마지막 옥상',line:'한 사람, 한 개의 옥상. 식량을 지키고 물을 아껴야 첫 밤을 넘긴다.'};
}
export function chooseTornadoApproach(seed,day){
  if(day<=SURVIVAL_BALANCE.firstDaySafeUntilDay)return 'distant';
  const x=(Math.imul((Number(seed)||1)>>>0,1664525)+1013904223)>>>0;
  const roll=x/4294967296;
  const distant=day<8?.44:.32;
  const near=day<8?.82:.72;
  return roll<distant?'distant':roll<near?'near':'direct';
}
export function tornadoWarningText(mode){
  return mode==='direct'
    ? '회오리가 옥상 가장자리까지 덮친다. 지금 대피하거나 물자를 고정해야 한다.'
    : mode==='near'
      ? '토네이도가 바로 옆 건물로 접근한다. 파편과 강풍이 식량 및 생존자를 위협한다.'
      : '먼 폐허 위로 토네이도가 움직인다. 붕괴 건물은 다시 세울 수 없다.';
}
