/** AFTERDAY v90 | Distance-scaled Black Map and extendable regional quests.
 * Pure campaign metadata. Existing site IDs, encounter rolls, supply grants,
 * day limits, saves and finale requirements remain authoritative elsewhere.
 * To expand: declare another district and attach future sites here. */
export const EXPLORATION_REGIONS=Object.freeze({
 near:Object.freeze({
  title:'근거리 · 생활권',
  scope:'옥상과 이어진 골목·주택·상가',
  map:'regions/near_neighborhood.webp',
  alt:'옥상을 중심으로 골목, 상점, 온실과 생활 시설이 모여 있는 가까운 폐허 동네',
  intro:'걸어서 돌아볼 수 있는 생활권입니다. 생존 장비와 이웃 건물의 단서를 찾으세요.'
 }),
 far:Object.freeze({
  title:'원거리 · 광역 도시권',
  scope:'강변·도심·산업지구·언덕까지 펼쳐진 도시',
  map:'regions/far_citywide.webp',
  alt:'동네를 넘어 교량과 강변, 산업 시설과 먼 도심까지 내려다보이는 광역 폐허 도시',
  intro:'17번 채널에서 위치를 확인한 도시 전역입니다. 지역마다 조사할 위험과 기록이 다릅니다.'
 })
});
export const EXPLORATION_DISTRICTS=Object.freeze({
 center:Object.freeze({title:'도심권',photo:'regions/district_center.webp',context:'밀집된 상권과 병원, 끊어진 공공시설이 있는 도심'}),
 industrial:Object.freeze({title:'산업지구',photo:'regions/district_industrial.webp',context:'녹슨 설비와 배전망이 남아 있는 공업 지대'}),
 waterfront:Object.freeze({title:'수변·교량지구',photo:'regions/district_waterfront.webp',context:'범람한 강가와 침수된 지하차도가 이어진 구역'}),
 hillside:Object.freeze({title:'언덕·피난지구',photo:'regions/district_hillside.webp',context:'경사진 주거지와 대피 시설, 높이 솟은 옥상이 있는 지구'})
});
/** One real, existing location/expedition per quest. A quest does not
 * manufacture rewards, other places, travel mechanics or extra rolls.
 * "done" is the same persisted site.completed flag used by the finale. */
/** Artwork-aligned marker positions are purely visual. Do not write them
 * into the player's save or alter authoritative site ID, travel or rewards.
 * Landmark matching: near map has greenhouse left, pharmacy/store right,
 * water tanks upper-left and tower upper-right; far map has helipad
 * upper-left, power grid left, hospital upper-right, market mid-right
 * and the flooded underpass lower-right. */
export const EXPLORATION_MAP_PINS=Object.freeze({
 near:Object.freeze({
  ruined_house:Object.freeze({x:.20,y:.75}),
  convenience_store:Object.freeze({x:.86,y:.63}),
  pharmacy:Object.freeze({x:.85,y:.34}),
  flower_shop:Object.freeze({x:.17,y:.44}),
  water_station:Object.freeze({x:.24,y:.24}),
  communications_room:Object.freeze({x:.79,y:.14})
 }),
 far:Object.freeze({
  hypermarket:Object.freeze({x:.85,y:.45}),
  underpass:Object.freeze({x:.74,y:.79}),
  hospital:Object.freeze({x:.71,y:.20}),
  substation:Object.freeze({x:.14,y:.35}),
  community_shelter:Object.freeze({x:.25,y:.60}),
  rooftop_helipad:Object.freeze({x:.15,y:.15})
 })
});
export function explorationPinPosition(zone,id){
 return EXPLORATION_MAP_PINS[zone]?.[id]||null;
}
export const EXPLORATION_QUESTS=Object.freeze({
 ruined_house:Object.freeze({district:null,title:'계단 아래 첫 흔적',objective:'금이 간 계단을 조사해 야전 텐트 흔적과 다음 이동 경로를 확인한다.',lead:'편의점 간판을 따라 다음 생활 물자를 찾는다.'}),
 convenience_store:Object.freeze({district:null,title:'잠긴 창고의 배송표',objective:'창고를 조사해 남아 있는 보급품과 납품 기록을 확인한다.',lead:'배송표에 남은 약국 주소와 화원 표지를 확인한다.'}),
 pharmacy:Object.freeze({district:null,title:'봉인된 약품함',objective:'변색된 약품을 피하며 안전한 보관함의 응급 물자를 확인한다.',lead:'약품 공급 장부를 따라 정수실 단서를 찾는다.'}),
 flower_shop:Object.freeze({district:null,title:'깨진 온실의 씨앗',objective:'붕괴한 온실에서 씨앗 보관함과 재배 가능한 물자를 조사한다.',lead:'급수 호스가 향하던 정수실 위치를 확인한다.'}),
 water_station:Object.freeze({district:null,title:'침수 정수실의 밸브',objective:'물에 잠긴 제어실에서 정수 장치와 배선 단서를 조사한다.',lead:'배관실 도면에 기록된 통신실 위치를 확인한다.'}),
 communications_room:Object.freeze({district:null,title:'17번 채널의 도면',objective:'교환대와 단파 무전기를 조사하고 통신탑의 파손 위치를 찾는다.',lead:'통신탑을 조사하고 수리 부품을 확보해 17번 채널을 연결한다.'}),
 hypermarket:Object.freeze({district:'center',title:'도심 물류창고의 재고',objective:'붕괴한 마트의 진열대 뒤 물류창고를 수색한다.',lead:'비축 창고의 기록을 남기고 도시 다른 지구를 조사한다.'}),
 underpass:Object.freeze({district:'waterfront',title:'침수 지하차도의 우회로',objective:'수위를 살피며 차량과 배수로 사이에서 안전한 우회 길을 찾는다.',lead:'침수 기록과 이동 가능한 경로를 생존 일지에 남긴다.'}),
 hospital:Object.freeze({district:'center',title:'봉쇄된 응급실의 기록',objective:'격리실을 피하면서 의약품과 응급 진료 기록을 조사한다.',lead:'발견한 의약품과 기록을 옥상에 가져와 생존에 활용한다.'}),
 substation:Object.freeze({district:'industrial',title:'멈춘 변전소의 전력 기록',objective:'잔류 전류 위험을 확인한 뒤 변전 설비와 전력 기록을 조사한다.',lead:'정전 구획을 기록하고 남은 도시의 생존 단서를 확인한다.'}),
 community_shelter:Object.freeze({district:'hillside',title:'공동 대피소의 마지막 장부',objective:'대피소 창고와 배급 기록에서 사람들의 마지막 이동 흔적을 조사한다.',lead:'대피 기록을 남기되 실제 구조 여부는 확인되지 않았음을 기록한다.'}),
 rooftop_helipad:Object.freeze({district:'hillside',title:'언덕 옥상의 구조 표식',objective:'옥상 헬기장의 안전한 접근로와 오래된 신호 장비를 확인한다.',lead:'17번 채널의 구조 신호 기록에 활용할 단서를 남긴다.'})
});
export const questBySite=id=>EXPLORATION_QUESTS[id]||null;
export function explorationQuestProgress(map,siteId){
 const quest=questBySite(siteId);
 if(!quest)return null;
 const record=map?.sites?.[siteId]||{};
 const status=record.completed?'done':
  record.visibility==='unknown'||!record.visibility?'locked':
  (record.visits||0)>0?'retry':'available';
 return {
  ...quest,
  status,
  statusLabel:{locked:'위치 미발견',available:'조사 가능',retry:'재조사 필요',done:'조사 완료'}[status],
  district:quest.district?EXPLORATION_DISTRICTS[quest.district]:null,
  attemptCount:Math.max(0,Number(record.visits)||0)
 };
}
export function explorationZoneProgress(map,zone,sites){
 const ids=sites.filter(x=>x.zone===zone).map(x=>x.id);
 return {total:ids.length,visited:ids.filter(id=>(map?.sites?.[id]?.visits||0)>0).length,
  completed:ids.filter(id=>Boolean(map?.sites?.[id]?.completed)).length};
}
