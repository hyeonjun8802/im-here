import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {makeHeavyClangWav} from '../src/metalClangAudio.js';

test('only the new V3 notification sound is wired',()=>{
  const board=readFileSync(new URL('../src/eventBoard.js',import.meta.url),'utf8');
  assert.equal((board.match(/new Audio\(/g)||[]).length,1);
  assert.match(board,/new Audio\(getHeavyClangAudioURL\(\)\)/);
  assert.match(board,/__afterdayEventBoardAudio/);
  assert.doesNotMatch(board,/metal_board_clang\.mp3/);
  assert.equal(existsSync(new URL('../public/assets/audio/metal_board_clang.mp3',import.meta.url)),false);
});

test('V3 sound is one valid, mono 16-bit PCM clip',()=>{
  const sampleRate=8000,duration=1.0,bytes=makeHeavyClangWav(sampleRate,duration);
  const view=new DataView(bytes);
  const fourcc=(i)=>String.fromCharCode(...new Uint8Array(bytes,i,4));
  assert.equal(fourcc(0),'RIFF');
  assert.equal(fourcc(8),'WAVE');
  assert.equal(fourcc(36),'data');
  assert.equal(view.getUint16(22,true),1);
  assert.equal(view.getUint16(34,true),16);
  assert.equal(view.getUint32(24,true),sampleRate);
  assert.equal(view.getUint32(40,true),Math.round(sampleRate*duration)*2);
  assert.equal(view.byteLength,44+Math.round(sampleRate*duration)*2);
});
