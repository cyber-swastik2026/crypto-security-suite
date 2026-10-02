// Crypto & Security Utility Suite - all logic runs locally in the browser
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const msg=(s,t,bad)=>{const e=$(s);e.textContent=t;e.className='msg '+(bad?'bad':'ok')};

// ---- navigation, tabs, ads ----
function openTab(t,scroll){$$('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab==t));$$('.panel').forEach(p=>p.classList.toggle('on',p.id==t));if(scroll)$('#tools').scrollIntoView({behavior:'smooth'})}
$$('[data-tab]').forEach(a=>a.addEventListener('click',e=>{if(!$('#tools'))return;e.preventDefault();openTab(a.dataset.tab,1);history.replaceState(null,'','#'+a.dataset.tab);$('#links').classList.remove('open')}));
if($('#tools')){const h=location.hash.slice(1);if(h=='stego'||h=='auditor')openTab(h,1)}
$('#menu')?.addEventListener('click',()=>$('#links').classList.toggle('open'));
$$('ins.adsbygoogle').forEach(a=>{if(/REPLACE/.test(a.dataset.adSlot))return;a.closest('.ad').classList.add('on');try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}});

// ---- steganography (LSB in R,G,B; alpha untouched) ----
const enc=$('#encCv');let orig=null;
$('#encFile')?.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const u=URL.createObjectURL(f),i=new Image();
 i.onload=()=>{enc.width=i.naturalWidth;enc.height=i.naturalHeight;const cx=enc.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,enc.width,enc.height);cx.drawImage(i,0,0);orig=cx.getImageData(0,0,enc.width,enc.height);enc.hidden=false;URL.revokeObjectURL(u);$('#cap').textContent='Capacity: '+(Math.floor(enc.width*enc.height*3/8)-4)+' bytes';msg('#encMsg','')};
 i.onerror=()=>msg('#encMsg','Could not read that image.',1);i.src=u});
$('#encBtn')?.addEventListener('click',()=>{
 if(!orig)return msg('#encMsg','Choose an image first.',1);
 const text=$('#secret').value;if(!text)return msg('#encMsg','Enter a secret message.',1);
 const data=new TextEncoder().encode(text),cap=Math.floor(enc.width*enc.height*3/8)-4;
 if(data.length>cap)return msg('#encMsg','Message too long ('+data.length+' bytes). Max '+cap+' bytes for this image.',1);
 const id=new ImageData(new Uint8ClampedArray(orig.data),enc.width,enc.height),px=id.data,buf=new Uint8Array(4+data.length);
 new DataView(buf.buffer).setUint32(0,data.length);buf.set(data,4);
 for(let i=0;i<buf.length*8;i++){const bit=(buf[i>>3]>>(7-(i&7)))&1,j=Math.floor(i/3)*4+i%3;px[j]=(px[j]&254)|bit}
 enc.getContext('2d').putImageData(id,0,0);
 enc.toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='stego-image.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1e4);msg('#encMsg','Done! Saved stego-image.png. Share it as a PNG only.')},'image/png')});
$('#decBtn')?.addEventListener('click',()=>{const f=$('#decFile').files[0];if(!f)return msg('#decMsg','Choose a PNG first.',1);
 const u=URL.createObjectURL(f),i=new Image();i.onerror=()=>msg('#decMsg','Could not read that image.',1);
 i.onload=()=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const cx=c.getContext('2d');cx.drawImage(i,0,0);URL.revokeObjectURL(u);
  const px=cx.getImageData(0,0,c.width,c.height).data,total=Math.floor(c.width*c.height*3/8);
  const rd=(start,n)=>{const o=new Uint8Array(n);for(let k=0;k<n*8;k++){const b=start*8+k,j=Math.floor(b/3)*4+b%3;o[k>>3]|=(px[j]&1)<<(7-(k&7))}return o};
  if(total<5)return msg('#decMsg','Image too small.',1);
  const len=new DataView(rd(0,4).buffer).getUint32(0);
  if(!len||len>total-4)return msg('#decMsg','No hidden message found in this image.',1);
  try{$('#out').value=new TextDecoder('utf-8',{fatal:true}).decode(rd(4,len));msg('#decMsg','Message revealed.')}catch(e){msg('#decMsg','No valid hidden message found.',1)}};
 i.src=u});

// ---- hash generator (Web Crypto) ----
const ALGS=['SHA-1','SHA-256','SHA-384','SHA-512'],hOut=$('#hOut');
if(hOut){hOut.innerHTML=ALGS.map(a=>'<div class="hrow"><b>'+a+'</b><code id="h-'+a+'">-</code><button class="mini" data-copy="h-'+a+'">Copy</button></div>').join('');
 const run=async()=>{if(!window.crypto||!crypto.subtle){hOut.textContent='Web Crypto needs HTTPS or localhost.';return}const d=new TextEncoder().encode($('#hIn').value);for(const a of ALGS){const h=await crypto.subtle.digest(a,d);$('#h-'+a).textContent=[...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}};
 $('#hIn').addEventListener('input',run);run();
 hOut.addEventListener('click',e=>{const id=e.target.dataset.copy;if(id)navigator.clipboard?.writeText($('#'+id).textContent).then(()=>{e.target.textContent='Copied';setTimeout(()=>e.target.textContent='Copy',1200)})})}

// ---- password auditor ----
const COMMON=['password','123456','qwerty','letmein','admin','welcome','iloveyou','abc123','monkey','dragon','login','princess','football','111111','000000'];
function audit(p){if(!p)return null;let pool=0;if(/[a-z]/.test(p))pool+=26;if(/[A-Z]/.test(p))pool+=26;if(/\d/.test(p))pool+=10;if(/[^A-Za-z0-9]/.test(p))pool+=33;
 let bits=p.length*Math.log2(pool);const low=p.toLowerCase(),tips=[];
 if(COMMON.some(c=>low.includes(c))){bits=Math.min(bits,20);tips.push('Contains a very common password or word.')}
 if(/(.)\1{2,}/.test(p)){bits*=.75;tips.push('Avoid repeated characters.')}
 if(/(abc|bcd|cde|123|234|345|456|567|678|789|qwe|asd|zxc)/i.test(p)){bits*=.8;tips.push('Avoid simple sequences.')}
 if(p.length<12)tips.push('Use at least 12 characters.');if(!/[A-Z]/.test(p)||!/[a-z]/.test(p))tips.push('Mix upper and lower case.');if(!/\d/.test(p))tips.push('Add numbers.');if(!/[^A-Za-z0-9]/.test(p))tips.push('Add symbols.');
 return{bits,tips}}
const YR=31557600;
function fmt(s){if(s<1)return 'instantly';if(s>=YR*1e9)return 'billions of years or more';for(const[n,v]of[['years',YR],['days',86400],['hours',3600],['minutes',60],['seconds',1]])if(s>=v){const x=s/v;return(x>=1e6?x.toExponential(1):Math.round(x).toLocaleString())+' '+n}return 'instantly'}
const pw=$('#pw');
if(pw){const L=[[28,'Very weak','#ff4d5e'],[36,'Weak','#ff9f43'],[60,'Fair','#ffd23f'],[80,'Strong','#2ee6a6'],[1e9,'Very strong','#18c8ff']];
 const up=()=>{const r=audit(pw.value);if(!r){$('#bar').style.width='0';$('#lvl').textContent='-';$('#lvl').style.color='';$('#ent').textContent='';$('#ct').textContent='-';$('#tips').innerHTML='';return}
  const l=L.find(x=>r.bits<x[0]);$('#bar').style.cssText='width:'+Math.min(100,r.bits)+'%;background:'+l[2];$('#lvl').textContent=l[1];$('#lvl').style.color=l[2];$('#ent').textContent='· '+Math.round(r.bits)+' bits of entropy';
  $('#ct').textContent=fmt(2**(Math.min(r.bits,300)-1)/1e10);$('#tips').innerHTML=r.tips.map(t=>'<li>'+t+'</li>').join('')};
 pw.addEventListener('input',up);$('#show').addEventListener('change',e=>{pw.type=e.target.checked?'text':'password'})}
