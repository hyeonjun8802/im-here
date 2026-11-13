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
  // Avalanche mixing is important: nearby seeds must not visit the same
  // threat category for hundreds of consecutive encounters.
  let x=(Number(seed)||1)>>>0;
  x^=x>>>16;x=Math.imul(x,0x7feb352d);
  x^=x>>>15;x=Math.imul(x,0x846ca68b);
  x^=x>>>16;
  const roll=(x>>>0)/4294967296;
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


/* Short, repeatable daily story beats between major 30-day chapters.
 * These are atmospheric lines about the EXISTING rooftop and systems, not
 * promises of an unimplemented mission, item or rescue. */
export const DAILY_SURVIVAL_BEATS=Object.freeze([
  {title:'바람이 멎은 자리',line:'옥상 난간 아래 도시가 고요하다. 비축품의 무게가 오늘의 선택을 바꾼다.'},
  {title:'계단실의 금속음',line:'바람에 오래된 문이 부딪힌다. 내려갈 용기보다 돌아올 준비가 필요하다.'},
  {title:'빈 화단의 아침',line:'마른 흙은 쉽게 달라지지 않는다. 한 번의 준비가 며칠 뒤 식량이 된다.'},
  {title:'비를 기다리는 통',line:'먹구름은 위험이자 기회다. 물탱크가 온전할 때만 비가 도움이 된다.'},
  {title:'차가운 도심의 숨',line:'멀리서 무너진 건물 사이로 바람이 새어 나온다. 대피소가 오늘도 버텨야 한다.'},
  {title:'불씨가 남긴 빛',line:'불빛은 작지만 이곳이 아직 살아 있다는 증거다. 쓸 수 있는 물자를 세어 본다.'},
  {title:'주인 없는 옥상',line:'세상은 멈춘 듯하지만 식량과 물은 계속 줄어든다. 다음 밤을 준비할 시간이다.'},
  {title:'녹슨 볼트 한 개',line:'작은 수리 하나가 큰 재난을 막을 수도 있다. 무너진 것을 먼저 살핀다.'},
  {title:'도시를 가르는 신호',line:'먼 건물의 그림자가 바뀌었다. 보이지 않는 위험에도 대비할 필요가 있다.'},
  {title:'살아남은 것의 무게',line:'물자 한 개가 하루의 결정을 바꾼다. 오늘은 무엇을 지킬 것인가?'},
  {title:'다음 비가 오기 전에',line:'맑은 하늘도 오래가지는 않는다. 수리와 비축은 평온한 시간에 한다.'},
  {title:'다시 밝아온 창가',line:'살아남은 하루가 쌓인다. 하지만 내일의 안전까지 보장하지는 않는다.'}
]);

/** Actionable, non-punitive direction drawn only from actual live state.
 * No virtual reward, daily login obligation or new save field is created. */
export function survivalPriority(s,day=1){
  if(!s||typeof s!=='object')return '건강과 식량·식수 상태를 먼저 확인하세요.';
  if(s.survivalStatus==='dead')return '생존 기록을 확인하세요.';
  if(s.weather==='tornado')return '강풍에 대비해 대피와 물자 보호를 결정하세요.';
  if(s.companion?.pending)return '구조 요청을 확인하고 물과 식량을 나눌지 결정하세요.';
  if((Number(s.supply?.water)||0)<=1)return '식수 재고가 위험합니다. 집수 또는 보급 경로를 확인하세요.';
  if((Number(s.supply?.food)||0)<=1)return '식량이 부족합니다. 오늘의 보급 기회를 확인하세요.';
  if(Number(s.health)<45)return '건강이 낮습니다. 휴식과 치료 가능 여부를 확인하세요.';
  if(s.scavenge?.pending)return '하단 보급 버튼에서 오늘의 탐색 위험과 보상을 비교하세요.';
  if(Number(s.facilities?.tank)<40)return '손상된 물탱크를 확인하고 수리 가능 여부를 살피세요.';
  if(s.kit?.tent===false)return '안전한 잠자리를 위해 텐트 탐색 기회를 기다리세요.';
  if(s.kit?.purifier===false)return '비를 식수로 만들 정수기 확보를 준비하세요.';
  if(s.kit?.seeds===false)return '장기 식량 확보를 위해 재배용 씨앗을 찾아보세요.';
  if(s.kit?.radio===false)return '도시의 생존 신호를 들을 무전기 확보를 준비하세요.';
  if(s.kit?.radio&&Number(s.scavenge?.radioLastDay)!==Number(day))
    return '무전기로 교신할 수 있는지 확인하세요.';
  return '물자 비축과 대피소 상태를 점검해 다음 날을 준비하세요.';
}

/** One new briefing per day, while keeping authored milestone chapters.
 * No state mutation: repeated reads and save/reload produce the same text. */
export function survivalDailyBriefing(day,s){
  const d=Math.max(1,Math.floor(Number(day)||1));
  const milestone=d===1||SURVIVAL_CHAPTERS.some(beat=>beat.day===d);
  const authored=milestone?survivalChapter(d):null;
  const note=DAILY_SURVIVAL_BEATS[(d-1)%DAILY_SURVIVAL_BEATS.length];
  const title=authored?.title||`DAY ${d} · ${note.title}`;
  const line=(authored?.line||note.line)+' 오늘의 목표: '+survivalPriority(s,d);
  return {day:d,title,line};
}
