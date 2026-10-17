import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const context = vm.createContext({window:{}});
vm.runInContext(readFileSync(new URL('../src/audio.js', import.meta.url), 'utf8'), context);
const {clickPCM, tones} = context.MetronomeAudio;
const rms = pcm => Math.sqrt(pcm.reduce((sum, v) => sum + v*v, 0) / pcm.length);

function previousClick(rate, frequency) {
  return Float32Array.from({length:Math.ceil(rate*.05)}, (_,i) => {
    const t=i/rate;
    if(t>.035) return 0;
    // Previous triangle, .4 peak exponentially decaying to .0001 in 35 ms.
    const triangle=2/Math.PI*Math.asin(Math.sin(2*Math.PI*frequency*t));
    return triangle*.4*Math.exp(Math.log(.0001/.4)*t/.035);
  });
}

test('each tone has clean boundaries, stronger energy and a distinct accented beat at device sample rates', () => {
  for(const rate of [24000,44100,48000,96000]) {
    const seen=[];
    for(const tone of tones) {
      const weak=clickPCM(rate,tone,false), strong=clickPCM(rate,tone,true);
      assert.equal(weak[0],0); assert.equal(Math.abs(weak.at(-1)),0);
      assert.equal(strong[0],0); assert.equal(Math.abs(strong.at(-1)),0);
      assert.equal(weak.length,Math.ceil(rate*.05));
      for(const pcm of [weak,strong]) {
        assert.ok(pcm.every(Number.isFinite));
        assert.ok(pcm.every(v=>Math.abs(v)<.941), 'peak reserve without flattening the waveform');
        assert.ok(rms(pcm)>rms(previousClick(rate,900))*2.5, 'at least 8 dB greater click energy at maximum volume');
        const dc=pcm.reduce((sum,v)=>sum+v,0)/pcm.length;
        assert.ok(Math.abs(dc)<.01, 'no substantial DC offset');
      }
      assert.notDeepEqual(weak,strong,'audible downbeat distinction');
      assert.ok(seen.every(pcm=>!pcm.every((v,i)=>v===weak[i])),'each choice changes the audio');
      seen.push(weak);
    }
  }
});
