import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

test('all alert and scenario notices are completely silent',()=>{
 const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 assert.doesNotMatch(board,/new Audio\(|\.playSound\(|\.audio\.play\(|getHeavyClangAudioURL|metalClangAudio|afterday-board-sound|__afterdayEventBoardAudio/);
 assert.ok(board.includes('this.element.hidden=true'));
 assert.ok(board.includes('this.dismiss()'));
 const css=readFileSync(new URL('../src/eventBoard.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/afterday-board-sound/);
 assert.equal(existsSync(new URL('../src/metalClangAudio.js',import.meta.url)),false);
 assert.equal(existsSync(new URL('../public/assets/audio/metal_board_clang.mp3',import.meta.url)),false);
});

test('weather and voluntary camp sound modules remain independent',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/toggleWeatherSound/);
 assert.match(main,/toggleCampMusic/);
});
