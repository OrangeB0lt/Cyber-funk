const fs=require('fs'),vm=require('vm'),path=require('path');
const src=['01_data_core.js','02_data_enemies.js','03_data_items.js','04_data_world.js','05_engine.js'].map(f=>fs.readFileSync(path.join(__dirname,'..','src',f),'utf8')).join('\n');
const ctx={console,Math,JSON,Object,Array}; vm.createContext(ctx);
vm.runInContext(src+'\nthis.__E={newState,makeEnemy,createBattle,runUntilPlayer,playerAction,livingEnemies,hasStatus,SKILLS,TIMING,addItem,countItem,fullRest,playerCanSolo,derivedStats};',ctx);
const E=ctx.__E;
const cls=process.argv[2]||'sousaphone', boss=process.argv[3]||'captain_hush', L=+(process.argv[4]||3);
const s=E.newState('Sim','yat',cls); s.level=L; s.gear.instrument=`inst_${cls}_${L>=11?'chrome':L>=7?'neon':L>=3?'street':'pawnshop'}`; s.gear.threads=L>=8?'thr_duster':L>=4?'thr_secondline':'thr_thrift'; if(L>=5)s.gear.charm='ch_gator'; if(L>=7)s.gear.mod='mod_jaw'; E.fullRest(s); if(L>=5)s.band.active=['sugar']; if(L>=7)s.band.active.push('static');
E.addItem(s,'gumbo',3);
const b=E.createBattle(s,[E.makeEnemy(s,boss,L)],{boss,noFlee:true});
console.log('player',JSON.stringify({hp:b.player.maxHp,fp:b.player.maxFp,stats:b.player.stats}),'boss',JSON.stringify({hp:b.enemies[0].maxHp,stats:b.enemies[0].stats}));
let g=0;
while(!b.over&&g++<60){
  E.runUntilPlayer(b); if(b.over)break;
  const p=b.player, t=E.livingEnemies(b)[0];
  let act;
  if(p.hp<p.maxHp*0.5&&E.countItem(s,'gumbo'))act={type:'bag',itemId:'gumbo'};
  else if(E.playerCanSolo(b))act={type:'solo',targetId:t.id};
  else if(!E.hasStatus(p,'muted')){const sk=p.skills.map(i=>E.SKILLS[i]).filter(k=>k.fp<=p.fp&&k.fx.some(f=>f.k==='dmg')); if(sk.length)act={type:'play',skillId:sk[sk.length-1].id,targetId:t.id};}
  if(!act)act={type:'riff',targetId:t.id};
  const r=Math.random(); const tm=r<.35?E.TIMING.one:r<.75?E.TIMING.pocket:r<.95?E.TIMING.loose:E.TIMING.clams;
  E.playerAction(b,act,act.type==='bag'?null:tm);
}
b.events.filter(e=>e.t==='log'||e.t==='round').forEach(e=>console.log(e.t==='round'?`--- round ${e.round} hp ${b.player.hp}`:e.text));
console.log('RESULT',b.result,'rounds',b.round);
