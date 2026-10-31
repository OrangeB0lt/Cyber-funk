const fs=require('fs'),path=require('path');const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'..','dist','cyberfunk.html'),'utf8');
const vc=new VirtualConsole(); const errs=[]; vc.on('error',(...a)=>errs.push(a.join(' '))); vc.on('jsdomError',e=>errs.push('jsdomError '+(e.stack||e)));
const dom=new JSDOM(html,{url:'https://cyberfunk.test/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc});
const w=dom.window,d=w.document; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const $=s=>d.querySelector(s); const $$=s=>Array.from(d.querySelectorAll(s)); const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
const log=s=>process.stderr.write(s+'\n');
const visible=el=>el&&!el.hidden;
setTimeout(async()=>{
  try{
  w.CF.UI.titleSettings.textSpeed='instant'; w.CF.UI.titleSettings.rhythm='auto';
  const S=w.newState('T','yat',process.argv[2]||'trumpet',w.CF.UI.titleSettings,0); w.CF.S=S; S.flags.metRoux=true; S.flags.hasCassette=true; S.main={act:'treme',step:1}; S.settings.reduceMotion=true; S.notes=['C','Eb','F','Gb','G','Bb'];
  w.goDistrict('treme'); await sleep(100);
  w.openDevMenu(); await sleep(20); click($('[data-act="items"]')); click($('[data-act="gear"]')); click($('[data-act="band"]')); click($('[data-act="boss:'+(process.argv[3]||'the_click')+'"]')); await sleep(100);
  let idle=0;
  for(let i=0;i<3000;i++){
    if(w.CF.S!==S){log('STATE REPLACED ngPlus '+w.CF.S.ngPlus+' notes '+w.CF.S.notes.length+' screen '+w.CF.UI.screen+' text '+d.body.textContent.replace(/\s+/g,' ').slice(0,200));break;} if(w.CF.UI.screen==='district'&&S.flags.ending){log('END district ending '+S.flags.ending+' ngPlus '+S.ngPlus+' notes '+S.notes.length);break;}
    let r=null;
    if(visible($('#popup'))){click($('#popup [data-act="ok"]')||$('#popup [data-act="yes"]')||$('#popup [data-act="popup-close"]'));r='popup';}
    else if(visible($('#timing'))){await sleep(60);r='timing';}
    else if(visible($('#sheet'))){click($('[data-act="sheet-close"]'));r='sheetclose';}
    else if($('[data-act="continue"]')){click($('[data-act="continue"]'));await sleep(5);if($('[data-act="continue"]'))click($('[data-act="continue"]'));r='cont';}
    else if($$('[data-act^="choice:"]').length){const ch=$$('[data-act^="choice:"]'); const labels=ch.map(c=>c.textContent); let idx=labels.findIndex(l=>/Keep playing/.test(l)); if(idx<0)idx=0; log('CHOICE '+labels.join(' / ')+' -> '+idx); click(ch[idx]);r='choice';}
    else if($$('.ecard.targetable').length){click($$('.ecard.targetable')[0]);r='target';}
    else if($('[data-act="act:blues"]')){click($('[data-act="act:blues"]'));r='blues';}
    else if($('[data-act="act:riff"]')){const p=w.CF.UI.battle.player; const play=$('[data-act="act:play"]'); if(play&&!play.classList.contains('disabled')&&p.fp>10&&Math.random()<0.6){click(play);await sleep(10);const sk=$$('.skillbtn').filter(s=>!s.classList.contains('disabled'));if(sk.length){click(sk[sk.length-1]);r='play:'+sk[sk.length-1].textContent.slice(0,20);}else{click($('[data-act="back"]'));r='back';}} else {click($('[data-act="act:riff"]'));r='riff';}}
    else if($$('[data-act^="skill:"]').length){click($('[data-act="back"]'));r='backpicker';}
    else if($('[data-act="retry"]')){click($('[data-act="retry"]'));r='retry';}
    if(!r){idle++; if(idle>150){log('IDLE at screen '+w.CF.UI.screen+' actions='+$('#actions').textContent.replace(/\s+/g,' ').slice(0,200)+' | h keys '+Object.keys(w.CF.UI.h).join(','));break;} await sleep(40);} else {idle=0; if(i%1===0)log(i+' '+r+' hp '+(w.CF.UI.battle&&w.CF.UI.battle.player.hp)+' groove '+(w.CF.UI.battle&&w.CF.UI.battle.player.groove)); await sleep(20);}
  }
  log('errs '+JSON.stringify(errs)); const b=w.CF.UI.battle; if(b){log('LOG: '+b.logLines.slice(-14).map(l=>l.text).join(' | ')); log('click statuses '+JSON.stringify(b.enemies[0].statuses)+' hp '+b.enemies[0].hp+' bluesFree '+b.bluesFree+' waiting '+b.waiting+' over '+b.over+' events '+JSON.stringify(b.events)+' draining '+JSON.stringify(b.draining)+' count '+b.drainCount+' round '+b.round+' idx '+b.idx+' order '+JSON.stringify(b.order));}
  }catch(e){log('ERR '+e.stack);}
  process.exit(0);
},200);
