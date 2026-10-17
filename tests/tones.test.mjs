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
      assert.equal(weak.length,Math.floor(rate*.055));
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

// Measured squared-sample energy per beat in release 1.5.0.
const v150Energy = {
  "24000:electronic:false": 0.0030669200369355973,
  "24000:electronic:true": 0.0030127725079701064,
  "24000:mechanical:false": 0.001361548509196815,
  "24000:mechanical:true": 0.0012889063625993928,
  "24000:rimshot:false": 0.0012783145813532,
  "24000:rimshot:true": 0.001042358380687445,
  "24000:cowbell:false": 0.0019943435425218434,
  "24000:cowbell:true": 0.0022629266370593087,
  "44100:electronic:false": 0.0030514891725263813,
  "44100:electronic:true": 0.0030196329927022407,
  "44100:mechanical:false": 0.001422197348681574,
  "44100:mechanical:true": 0.0012303879368786848,
  "44100:rimshot:false": 0.0012366486692730974,
  "44100:rimshot:true": 0.0010460873272150188,
  "44100:cowbell:false": 0.002001732179162491,
  "44100:cowbell:true": 0.002266039586296803,
  "48000:electronic:false": 0.0030666986642837704,
  "48000:electronic:true": 0.003012745850237061,
  "48000:mechanical:false": 0.0013711398342574623,
  "48000:mechanical:true": 0.0011840620669397606,
  "48000:rimshot:false": 0.0013417784103339908,
  "48000:rimshot:true": 0.0010548336168943497,
  "48000:cowbell:false": 0.0019936053775125168,
  "48000:cowbell:true": 0.002262190249999825,
  "96000:electronic:false": 0.003046211128272536,
  "96000:electronic:true": 0.003006706164000387,
  "96000:mechanical:false": 0.0013205993538684604,
  "96000:mechanical:true": 0.0011759853190142892,
  "96000:rimshot:false": 0.0012037304707476987,
  "96000:rimshot:true": 0.0009603195942822202,
  "96000:cowbell:false": 0.001993430655433861,
  "96000:cowbell:true": 0.0022620166918448036
};

test("all four tones gain at least 5 dB per beat over 1.5.0 without exceeding the fast-tempo window", () => {
  for(const rate of [24000,44100,48000,96000]) for(const tone of tones) for(const strong of [false,true]) {
    const pcm=clickPCM(rate,tone,strong);
    const energy=pcm.reduce((sum,v)=>sum+v*v,0)/rate;
    assert.ok(energy >= v150Energy[`${rate}:${tone}:${strong}`]*10**.5, `${tone} must be audibly louder than 1.5.0`);
    assert.ok(pcm.length/rate <= .075-.02+1e-9, 'no overlap with the next 400 BPM /8 consonant');
  }
});
