import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

test('scenario and situation notices use only the supplied notification MP3',()=>{
 const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
 assert.match(board,/dragon-studio-notification-sound-372474\.mp3/);
 assert.equal((board.match(/new Audio\(/g)||[]).length,1);
 assert.equal((board.match(/this\.playNoticeSound\(\);/g)||[]).length,2);
 assert.match(board,/this\.noticeAudio\.pause\(\)/);
 assert.match(board,/this\.pendingNoticeSound=false/);
 assert.doesNotMatch(board,/metal_board_clang|\.playSound\(|pendingSound|afterday-board-sound|getHeavyClangAudioURL/);
 assert.ok(existsSync(new URL('../public/assets/audio/dragon-studio-notification-sound-372474.mp3',import.meta.url)));
 assert.equal(existsSync(new URL('../public/assets/audio/metal_board_clang.mp3',import.meta.url)),false);
});

test('weather and optional camp sounds remain independent',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/toggleWeatherSound/);
 assert.match(main,/toggleCampMusic/);
});
