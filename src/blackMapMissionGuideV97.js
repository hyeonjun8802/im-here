/** AFTERDAY v97: read-only command guidance for Black Map.
 * This module never changes saves, expedition rolls, resources, or availability. */
import {EXPLORATION_SITES} from './explorationMapV78.js';
const zoneSites=zone=>EXPLORATION_SITES.filter(item=>item.zone===zone);
const finished=(map,item)=>Boolean(map?.sites?.[item.id]?.completed);
const count=(map,zone)=>zoneSites(zone).filter(item=>finished(map,item)).length;
const pending=(map,zone)=>zoneSites(zone).find(item=>!finished(map,item)&&map?.sites?.[item.id]?.visibility!=='unknown')||
 zoneSites(zone).find(item=>!finished(map,item))||null;
export function buildBlackMapGuide(state){
 const map=state?.explorationMap||{},near=count(map,'near'),far=count(map,'far'),total=near+far;
 const base={total,near,far,progress:Math.round(total/12*100),
  targetId:null,zone:'near',kind:'site',chapter:'01',chapterName:'생활권 확보',
  title:'다음 탐사 준비',description:'위치가 발견된 장소에서 생존 물자를 확보하세요.'};
 if(map.mission){
  const site=EXPLORATION_SITES.find(item=>item.id===map.mission.siteId),phase=map.mission.phase;
  return {...base,kind:'mission',zone:site?.zone||'near',targetId:site?.id||null,
   chapter:'진행 중',chapterName:'탐험 진행 중',title:site?.label||'현재 탐험',
   description:phase==='outbound'?'이동 중입니다. 현장에 도착하면 탐사 방법을 선택합니다.':
    phase==='encounter'?'현장에 도착했습니다. 수색·정찰·회수·복귀 중 하나를 선택하세요.':
    '귀환 중입니다. 옥상에 도착하면 보상과 조사 결과가 기록됩니다.'};
 }
 if(near<6){
  const site=pending(map,'near'),retry=(map.sites?.[site?.id]?.visits||0)>0;
  return {...base,targetId:site?.id||null,
   title:(retry?'재조사 목표 · ':'다음 목표 · ')+(site?.label||'근거리 탐사'),
   description:retry?'지난 탐사에서 목표를 완료하지 못했습니다. 다른 탐사 방법을 검토해 보세요.':
    '이 장소를 조사 완료하면 다음 장소가 열립니다. 예상 발견: '+(site?.reward||'생존 물자')};
 }
 const phase=map.tower?.phase||'unknown';
 if(phase!=='channel17'){
  const parts=Math.max(0,Math.floor(Number(state?.supply?.parts)||0));
  const steps={
   unknown:['통신탑 단서 확인','통신실에서 획득한 기록을 확인해야 통신탑 복구를 진행할 수 있습니다.'],
   discovered:['고장 난 통신탑 조사','통신탑의 파손 위치를 확인하고 복구 방법을 조사하세요.'],
   surveyed:['수리 부품 확보 · '+Math.min(parts,4)+'/4','수리 부품 4개가 있어야 통신탑 복구 작업을 진행할 수 있습니다.'],
   parts_ready:['통신탑 배선 복구','부품 확보를 완료했습니다. 전원과 배선을 복구하세요.'],
   restored:['17번 채널 연결','단파 무전기로 17번 채널을 연결하면 원거리 탐사가 열립니다.']
  };
  const [title,description]=steps[phase]||steps.unknown;
  return {...base,kind:'tower',chapter:'02',chapterName:'끊긴 신호 복구',
   title,description:phase==='restored'&&!state?.kit?.radio?
    '단파 무전기가 있어야 17번 채널로 연결할 수 있습니다.':description};
 }
 if(far<6){
  const site=pending(map,'far'),retry=(map.sites?.[site?.id]?.visits||0)>0;
  return {...base,chapter:'03',chapterName:'도시의 흔적',zone:'far',targetId:site?.id||null,
   title:(retry?'재조사 목표 · ':'다음 목표 · ')+(site?.label||'원거리 탐사'),
   description:retry?'방문 기록은 있지만 조사 완료하지 못했습니다. 다음 탐사에서 다시 도전하세요.':
    '남은 장소를 조사하면 최종 기록이 열립니다. 예상 발견: '+(site?.reward||'생존 단서')};
 }
 if(!map.ending||map.ending.type==='none')
  return {...base,kind:'finale',chapter:'04',chapterName:'마지막 선택',zone:'far',
   title:'12곳 조사 완료 · 마지막 기록',description:'옥상에 정착할지 구조 신호를 남길지 선택하세요.'};
 return {...base,kind:'done',chapter:'완료',chapterName:'생존은 계속됩니다',zone:'far',
  title:'검은 지도 탐사 완료',description:map.ending.type==='signal'?
   '구조 신호를 남겼습니다. 구조는 보장되지 않으며 생존은 계속됩니다.':
   '옥상 정착을 기록했습니다. 생존과 옥상 관리는 계속됩니다.'};
}
