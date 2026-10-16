// Package the approved recordings offline. No API, credentials or speech model
// are needed to rebuild this voice. AAC encoding uses macOS afconvert.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fitSpeech} from '../../src/stretch.js';
import {prepareAttack} from '../recorded-voice/attack.mjs';

const rate = 24000;
const sourceRoot = new URL('./source/',import.meta.url);
const sourceBytes = await readFile(new URL('manifest.json',sourceRoot));
const source = JSON.parse(sourceBytes);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen',
    'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety',
    'hundred','thousand','million','billion','trillion','quadrillion','rest','next','speed'];
const caps = [Infinity,...[100,120,140,160,180,210,240,280,320,400,500,640,800].map(bpm=>60/bpm*.98)];

function readWave(bytes) {
    let channels, sampleRate, data;
    for (let offset=12;offset+8<=bytes.length;) {
        const tag=bytes.toString('ascii',offset,offset+4),size=bytes.readUInt32LE(offset+4);
        if (tag==='fmt ') {
            if(bytes.readUInt16LE(offset+8)!==1||bytes.readUInt16LE(offset+22)!==16) throw new Error('Expected PCM16 source');
            channels=bytes.readUInt16LE(offset+10);sampleRate=bytes.readUInt32LE(offset+12);
        }
        if(tag==='data') data=bytes.subarray(offset+8,offset+8+size);
        offset+=8+size+size%2;
    }
    if(sampleRate!==rate||!channels||!data?.length) throw new Error('Invalid WAV');
    return Float32Array.from({length:data.length/(2*channels)},(_,frame)=>{
        let sum=0;
        for(let channel=0;channel<channels;channel++) sum+=data.readInt16LE((frame*channels+channel)*2)/32768;
        return sum/channels;
    });
}

function wave(pcm) {
    const bytes=Buffer.alloc(44+pcm.length*2);
    bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);
    bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);
    bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);
    bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);
    bytes.write('data',36);bytes.writeUInt32LE(pcm.length*2,40);
    pcm.forEach((x,i)=>bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+i*2));
    return bytes;
}

// Match the approved Maeve comparison sample, including its original 1–4/Rest
// take, trim, gain, attack preparation and pre-rendered duration variants.
function trim(pcm) {
    const peak=pcm.reduce((m,x)=>Math.max(m,Math.abs(x)),0);
    const first=pcm.findIndex(x=>Math.abs(x)>peak*.003),last=pcm.findLastIndex(x=>Math.abs(x)>peak*.003);
    if(first<0) throw new Error('Silent cue');
    const out=pcm.slice(first,last+1).map(x=>x/peak*.65);
    for(let i=0;i<Math.min(24,out.length/2);i++) {
        out[i]*=(i+1)/24;out[out.length-1-i]*=(i+1)/24;
    }
    return out;
}

const originals={};
for(const [filename,entry] of Object.entries(source.files)) {
    const bytes=await readFile(new URL(filename,sourceRoot));
    if(hash(bytes)!==entry.sha256) throw new Error(`Source hash mismatch: ${filename}`);
    const pcm=readWave(bytes);
    for(const [word,[start,end]] of Object.entries(entry.segments)) {
        if(originals[word]||start<0||end<=start||end*rate>pcm.length+1) throw new Error(`Invalid range: ${word}`);
        originals[word]=trim(pcm.slice(Math.round(start*rate),Math.round(end*rate)));
    }
}
for(const word of words) if(!originals[word]) throw new Error(`Missing cue: ${word}`);

await mkdir('public/audio',{recursive:true});
await mkdir('tests/fixtures',{recursive:true});
async function bank(names,filename,variants) {
    const samples=[],clips={};
    for(const word of names) {
        const original=word==='rest'?originals[word]:prepareAttack(originals[word],rate,{word}).pcm;
        clips[word]=[];
        for(const cap of variants&&word!=='rest'?caps:[Infinity]) {
            if(clips[word].length&&original.length<=cap*rate) continue;
            const fitted=fitSpeech(original,rate,cap);
            const pcm=word==='rest'?fitted:prepareAttack(fitted,rate,{word,maxLeadSeconds:Math.min(.025,cap*.12)}).pcm;
            clips[word].push({cap:Number.isFinite(cap)?cap:null,offset:samples.length,length:pcm.length});
            for(const sample of pcm) samples.push(sample);
            for(let i=0;i<rate*.04;i++) samples.push(0);
        }
    }
    const fixture=`tests/fixtures/${filename}.wav`,target=`public/audio/${filename}.m4a`;
    await writeFile(fixture,wave(Float32Array.from(samples)));
    execFileSync('afconvert',[fixture,target,'-f','m4af','-d','aac@24000','-c','1','-b','48000','-q','127','--no-filler']);
    const encoded=await readFile(target);
    return {clips,sha256:hash(encoded),encoded:encoded.toString('base64'),bytes:encoded.length};
}

const common=await bank(['one','two','three','four','rest'],'counts-maeve-v6',true);
if(hash(await readFile('tests/fixtures/counts-maeve-v6.wav'))!==source.approvedCommonWaveSha256) {
    throw new Error('The approved 1–4/Rest preview has changed');
}
const extra=await bank(words.slice(5,11),'counts-maeve-extra-v6',true);
const extendedBank=await bank(words,'counts-maeve-words-v6',false);
const metadata={version:6,sampleRate:rate,voice:source.voice,voiceId:source.voice_id,
    voiceType:source.voice_type,provider:source.provider,model:source.model,sourceManifestSha256:hash(sourceBytes)};
const extended={manifest:'./assets/audio/counts-maeve-words-v6.json',src:'./assets/audio/counts-maeve-words-v6.m4a',sha256:extendedBank.sha256};
await writeFile('public/audio/counts-maeve-words-v6.json',JSON.stringify({...metadata,
    clips:Object.fromEntries(Object.entries(extendedBank.clips).map(([word,entries])=>[word,{offset:entries[0].offset,length:entries[0].length}]))},null,2)+'\n');
const manifest={...metadata,processing:'Offline pitch-preserving duration variants; playbackRate 1',
    caps:caps.map(x=>Number.isFinite(x)?x:null),sha256:common.sha256,clips:common.clips,
    extra:{src:'./assets/audio/counts-maeve-extra-v6.m4a',clips:extra.clips,sha256:extra.sha256},extended};
await writeFile('public/audio/counts-maeve-v6.json',JSON.stringify(manifest,null,2)+'\n');
await writeFile('public/audio/voice-data.js','// Prepared Maeve voice. See THIRD_PARTY_NOTICES.md.\nglobalThis.MetronomeVoiceData='+JSON.stringify({...manifest,encoded:common.encoded})+';\n');
console.log(JSON.stringify({voice:source.voice,words:words.length,commonBytes:common.bytes,extraBytes:extra.bytes,extendedBytes:extendedBank.bytes}));
