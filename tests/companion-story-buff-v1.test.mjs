import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,sanitize,DAY_MS} from '../src/simulation.js';
import {companionProductionFactor,companionBuffView,companionStoryBeat} from '../src/supportCompanion.js';
import {survivalDailyBriefing,survivalChapter} from '../src/survivalBalance.js';

const day0=Date.UTC(2026,10,14);
const state=()=>{
 const s=defaults(day0);
 s.companion.present=true;
 s.companion.arrivedDay=5;
 s.companion.health=78;
 return s;
};

test('visible buff follows actual production tools and companion work health',()=>{
 const s=state();
 assert.equal(companionProductionFactor(s),1.3,'helper already has production factor');
 assert.equal(companionBuffView(s).state,'waiting','no owned producer means no visible buff');
 s.kit.purifier=true;s.facilities.tank=20;
 assert.equal(companionBuffView(s).state,'waiting','broken tank must not advertise an effective boost');
 s.facilities.tank=90;
 assert.equal(companionBuffView(s).state,'boosted');
 assert.match(companionBuffView(s).label,/정수 속도 \+30%/);
 s.kit.seeds=true;
 assert.match(companionBuffView(s).label,/정수·재배 속도 \+30%/);
 assert.match(companionBuffView(s).description,/식량 1개·식수 1개/);
 s.companion.health=20;
 assert.equal(companionProductionFactor(s),1);
 assert.equal(companionBuffView(s).state,'resting','fatigued companion loses benefit');
 assert.doesNotMatch(companionBuffView(s).label,/\+30%/);
 s.companion.present=false;
 assert.equal(companionBuffView(s).state,'absent');
});

test('companion story follows saved join day, never invents resources or overwrites milestones',()=>{
 const s=state();
 const before=JSON.stringify(s);
 assert.match(companionStoryBeat(s,6).title,/첫 아침/);
 assert.match(survivalDailyBriefing(6,s).line,/두 사람/);
 assert.match(survivalDailyBriefing(8,s).title,/작업대/);
 s.kit.purifier=true;s.facilities.tank=90;
 assert.match(survivalDailyBriefing(8,s).title,/물탱크/);
 s.companion.obtainedParts=1;
 assert.match(survivalDailyBriefing(12,s).title,/나사/);
 assert.match(survivalDailyBriefing(19,s).title,/열네/);
 assert.equal(survivalDailyBriefing(10,s).title,survivalChapter(10).title);
 assert.equal(companionStoryBeat(s,20),null);
 assert.equal(JSON.stringify(s),JSON.stringify(JSON.parse(JSON.stringify(s))),'pure data helpers');
 const saved=sanitize(JSON.parse(JSON.stringify(s)),day0+DAY_MS);
 assert.equal(survivalDailyBriefing(8,saved).title,survivalDailyBriefing(8,s).title);
 const untouched=state();
 assert.equal(JSON.stringify(untouched),before,'reads never change initial game state');
});

test('existing kit text shows one readable buff tag and companion resolution is silent',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/hudAlignmentV1300.css',import.meta.url),'utf8');
 assert.match(main,/import \{companionBuffView\} from '\.\/supportCompanion\.js'/);
 assert.match(main,/companionNode\.classList\.toggle\('companion-buff-active'/);
 assert.match(main,/companionNode\.setAttribute\('aria-label',companionLong\)/);
 assert.match(css,/#companion-status\.companion-buff-active\{/);
 assert.match(css,/@media \(max-width:720px\)\s*\{[\s\S]*?companion-buff-active/);
 assert.match(board,/companionJoined:\{\s*category:'동료 합류'/);
 assert.match(board,/companionOutcome:\{\s*category:'구조 선택의 결과'/);
 assert.match(main,/eventBoard\?\.show\(joined\?'companionJoined':'companionOutcome',[\s\S]*?silent:true,duration:10500/);
 assert.doesNotMatch(main,/applyAction\(state,'companionJoined'\)/);
});
