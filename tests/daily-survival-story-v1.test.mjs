import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults} from '../src/simulation.js';
import {offerDailyScavenge} from '../src/scavengeDirector.js';
import {survivalChapter,survivalDailyBriefing,survivalPriority,DAILY_SURVIVAL_BEATS} from '../src/survivalBalance.js';

const original=()=>defaults(Date.UTC(2026,10,13,0,0,0));

test('30-day milestone chapters remain authored and intermediate days tell fresh stories',()=>{
  const state=original();
  assert.equal(survivalDailyBriefing(3,state).title,survivalChapter(3).title);
  assert.equal(survivalDailyBriefing(5,state).title,survivalChapter(5).title);
  assert.equal(survivalDailyBriefing(30,state).title,survivalChapter(30).title);
  assert.notEqual(survivalDailyBriefing(4,state).title,survivalDailyBriefing(3,state).title);
  assert.notEqual(survivalDailyBriefing(21,state).title,survivalDailyBriefing(22,state).title);
  assert.ok(DAILY_SURVIVAL_BEATS.length>=10);
  assert.match(survivalDailyBriefing(31,state).title,/DAY 31/);
});

test('daily goals respond to actual needs; no new loot, mutation, or fake missions',()=>{
  const s=original();
  const before=JSON.stringify(s);
  assert.match(survivalPriority(s,1),/텐트/);
  assert.match(survivalDailyBriefing(1,s).line,/오늘의 목표:/);
  assert.equal(JSON.stringify(s),before,'read-only briefing must not alter saves');
  offerDailyScavenge(s,1);
  assert.match(survivalPriority(s,1),/하단 보급 버튼/);
  s.weather='tornado';
  assert.match(survivalPriority(s,1),/대피/);
  s.weather='cloud';s.supply.water=1;
  assert.match(survivalPriority(s,1),/식수 재고/);
  s.supply.water=4;s.supply.food=1;
  assert.match(survivalPriority(s,1),/식량/);
  s.supply.food=3;s.companion.pending={id:'signal:1'};
  assert.match(survivalPriority(s,1),/구조 요청/);
});

test('a completed expedition shows one silent, dismissible result, not a second reward',()=>{
  const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
  assert.match(js,/survivalDailyBriefing\(day,state\)/);
  assert.match(board,/expeditionResult:\{\s*category:'탐색의 결과'/);
  assert.match(js,/eventBoard\?\.show\('expeditionResult',[\s\S]*?silent:true,duration:7800/);
  assert.match(js,/result\.good&&action\.startsWith\('scavenge_'\)&&result\.outcome!=='safe'/);
  assert.doesNotMatch(js,/addEvent\(state,'expeditionResult'\)|applyAction\(state,'expeditionResult'/);
});
