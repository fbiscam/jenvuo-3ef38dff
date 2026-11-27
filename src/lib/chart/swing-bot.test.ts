import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { confirmedSwings, confirmedEntries, entryAllowed, simulate, isFridayCutoff, inNewsWindow, MAX_OPEN, BREAKER_PCT, type Bar } from './swing-bot';
import { computeSmcOverlay, computeLivePivots } from './smc-overlay';
import { classifySwingPriceAction } from './swing-price-action';
import { classifySwingSweep } from './swing-sweep';
import { isHighProbabilityPriceAction, isHighProbabilitySweep } from './high-probability';

const H = 3600, t0 = Date.UTC(2026,10,23)/1000;
const mk = (rows: number[][]): Bar[] => rows.map((row,i) => {
 const [open,high,low,close] = row;
 if(open===undefined||high===undefined||low===undefined||close===undefined)throw Error('incomplete fixture');
 return {time:t0+i*H,open,high,low,close};
});
const setup = mk([...Array.from({length:20},()=>[9,10,8,9]),[10,14,8,9], [9,10,6,7], [7,8,5,6], [6,7,4,5], [5,6,3,4], [4,5,2,3]]);
const spec = (symbol:string) => ({symbol,pip:1,usdPerUnit:1,weekendGuard:true});

describe('Jenvu EA approved rules',()=> {
 it('accepts PA only, sweep only, or both; neither is rejected',()=> {
   assert.equal(entryAllowed(true,false),true);assert.equal(entryAllowed(false,true),true);
   assert.equal(entryAllowed(true,true),true);assert.equal(entryAllowed(false,false),false);
 });
 it('does not impose a portfolio two-trade cap',()=> {assert.equal(MAX_OPEN,Infinity);
   const r=simulate(['A','B','C'].map(symbol=>({spec:spec(symbol),bars:setup})),[],2500);
   assert.equal(new Set(r.trades.map(t=>t.symbol)).size,3);
 });
 it('never backdates settled evidence to Candle 1 and keeps the wick SL',()=> {
   const raw=confirmedSwings(setup,'X').find(s=>s.dir===-1);
   const entries=confirmedEntries(setup,'X').filter(s=>s.dir===-1);
   assert.ok(raw);assert.equal(entries.length,1);const s=entries[0];assert.ok(s);
   assert.ok(s.at>=raw.at+2*H);assert.equal(s.sl,14);
   assert.equal(confirmedEntries(setup.slice(0,22),'X').filter(s=>s.dir===-1).length,0);
 });
 it('future candles cannot change an already emitted entry',()=> {
   const a=confirmedEntries(setup,'X');const last=setup.at(-1);assert.ok(last);
   const extended=[...setup,{time:last.time+H,open:3,high:30,low:1,close:20}];
   assert.deepEqual(confirmedEntries(extended,'X').filter(s=>s.at<=last.time+H),a);
 });
 it('blocks entries throughout the one-hour-before and one-hour-after news window',()=> {
   const entries=confirmedEntries(setup,'X');const s=entries[0];assert.ok(s);
   assert.equal(inNewsWindow(s.at-H,[s.at]),true);assert.equal(inNewsWindow(s.at+H,[s.at]),true);
   assert.equal(inNewsWindow(s.at+H+1,[s.at]),false);
   const r=simulate([{spec:spec('X'),bars:setup}],[s.at],2500);assert.equal(r.trades.length,0);
 });
 it('Friday cutoff begins exactly at 20:00 UTC',()=> {
   assert.equal(isFridayCutoff(Date.UTC(2026,10,27,19,59)/1000),false);
   assert.equal(isFridayCutoff(Date.UTC(2026,10,27,20)/1000),true);
 });
 it('retains the requested 4.5% emergency threshold',()=> {assert.equal(BREAKER_PCT,4.5);assert.equal(2500*BREAKER_PCT/100,112.5);});
});

it('actual MQL closed-candle predicates match Terminal gates and pressure on replayed prefixes',()=> {
 const source=readFileSync('resources/mt5/Jenvu EA.mq5','utf8');
 const start=source.indexOf('double Clamp('), end=source.indexOf('// END PURE PREDICATES');assert.ok(start>=0&&end>start);
 const predicates=source.slice(start,end).replaceAll('const MqlRates &r[]','const MqlRates *r');
 let seed=321;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 let price=100;const rows:number[][]=[];
 for(let k=0;k<260;k++){const o=price,c=o+(rand()-.5)*8;rows.push([o,Math.max(o,c)+rand()*4,Math.min(o,c)-rand()*4,c]);price=c;}
 const datasets=[setup,mk(rows)];const tests:string[]=[];let comparisons=0;
 for(const [di,bars] of datasets.entries()) {
   for(let n=20;n<=bars.length;n++) {
     const closed=bars.slice(0,n),last=closed.at(-1);assert.ok(last);
     const cs=closed.map(b=>({t:b.time,o:b.open,h:b.high,l:b.low,c:b.close}));
     const overlay=computeSmcOverlay(closed.map(b=>({...b,volume:0})),last.close,null,{useVolume:false});
     for(const p of computeLivePivots(cs,null,[])) {
       const i=cs.findIndex(b=>b.t===p.t),high=p.kind==='high';
       const pressure=overlay.pressure?.[p.t * 1000];assert.notEqual(pressure,undefined);
       const pa=isHighProbabilityPriceAction(classifySwingPriceAction(cs,i,p.kind,pressure));
       const sw=isHighProbabilitySweep(classifySwingSweep(cs,i,p.kind));
       tests.push(`assert(FreshPivot(d${di},${n},${high})==${i}); assert(BuyerPressure(d${di},${n},${i},${high})==${pressure}); assert(PriceActionOk(d${di},${n},${i},${high})==${pa}); assert(SweepOk(d${di},${n},${i},${high})==${sw});`);comparisons++;
     }
   }
 }
 assert.ok(comparisons>50);
 const dir=mkdtempSync(join(tmpdir(),'jenvu-native-'));
 const data=datasets.map((bars,i)=>`MqlRates d${i}[]={${bars.map(b=>`{${b.open},${b.high},${b.low},${b.close}}`).join(',')}};`).join('\n');
 const cpp=`#include <cmath>\n#include <cassert>\n#include <algorithm>\ntemplate<class A,class B> auto MathMax(A a,B b){return std::max((double)a,(double)b);}\ntemplate<class A,class B> auto MathMin(A a,B b){return std::min((double)a,(double)b);}\ndouble MathAbs(double x){return std::abs(x); }\ndouble MathFloor(double x){return std::floor(x);}\nstruct MqlRates{double open,high,low,close;};\n${predicates}\nint main(){${data}\n${tests.join('\n')}\nassert(!CanEnter(false,false,false));assert(!CanEnter(false,true,false));assert(!CanEnter(false,false,true));assert(CanEnter(false,true,true));assert(CanEnter(true,false,false));assert(EntryAllowed(true,false));assert(EntryAllowed(false,true));assert(EntryAllowed(true,true));assert(!EntryAllowed(false,false));assert(DefaultLots(true,false)==0.02);assert(DefaultLots(false,true)==0.05);assert(DefaultLots(false,false)==0.35);assert(NewsBlockedAt(6400,10000));assert(NewsBlockedAt(13600,10000));assert(!NewsBlockedAt(13601,10000));assert(!FridayBlocked(5,19,false));assert(FridayBlocked(5,20,false));assert(!FridayBlocked(5,20,true));assert(!MustBreak(2500,2387.51));assert(MustBreak(2500,2387.50));}`;
 const path=join(dir,'predicates.cpp'),binary=join(dir,'predicates');writeFileSync(path,cpp);
 execFileSync('g++',['-std=c++17',path,'-o',binary]);execFileSync(binary,[]);
});

it('EA exposes only MyIP and requires successful HTTP validation outside tester',()=> {
 const s=readFileSync('resources/mt5/Jenvu EA.mq5','utf8');
 const inputs=[...s.matchAll(/^input\s+\w+\s+(\w+)/gm)].map(m=>m[1]);assert.deepEqual(inputs,['MyIP']);
 assert.match(s,/code==200 && StringFind/);assert.match(s,/CanEnter\(\(bool\)MQLInfoInteger\(MQL_TESTER\),g_licensed,StringLen\(MyIP\)>=7\)/);
 assert.doesNotMatch(s,/OpenCount\(\) >= MaxOpen/);
});
