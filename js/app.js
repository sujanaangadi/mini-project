const GATES=["G0","G1","G2","G3","G4","G5"],KEY="gatetrack_v2",SES="gatetrack_ses_v2",OK=["pdf","doc","docx","ppt","pptx"];
let db,S={tab:null,gate:"G0",mode:"login",role:"student",msg:"",err:"",rt:null,rg:null,ro:false},ses=null;
function seed(){return{users:[
{email:"reviewer@demo.com",pw:"1234",role:"reviewer",name:"Reviewer One"},
{email:"coord@demo.com",pw:"1234",role:"coordinator",name:"Coordinator"}],
teams:[],subs:[],msgs:[],revs:[]}}
const GUIDES=[
{email:"indira@kletech.ac.in",pw:"12345",role:"guide",name:"Indira Bidari"},
{email:"priyadarshini@kletech.ac.in",pw:"12345",role:"guide",name:"Priyadarshini Patil"},
{email:"jayalaxmi@kletech.ac.in",pw:"12345",role:"guide",name:"Jayalaxmi G N"},
{email:"neha@kletech.ac.in",pw:"12345",role:"guide",name:"Neha Panchal"},
{email:"vijay@kletech.ac.in",pw:"12345",role:"guide",name:"Vijay Biradar"}];
try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}db=db||seed();
db.users=db.users.filter(u=>u.role!=="guide").concat(GUIDES);save();
try{ses=localStorage.getItem(SES)}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){S.err="Storage full — remove old files or use smaller files."}}
const $=id=>document.getElementById(id),v=id=>($(id)?.value||"").trim();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const user=()=>db.users.find(u=>u.email===ses),team=id=>db.teams.find(t=>t.id===id);
const myTeam=u=>team(u.team);const fmt=t=>new Date(t).toLocaleString([], {dateStyle:"medium",timeStyle:"short"});
const pill=s=>`<span class="pill ${s}">${s==="correction"?"needs correction":s}</span>`;
const lastSub=(t,g)=>db.subs.filter(s=>s.team===t&&s.gate===g).slice(-1)[0];
function logout(){ses=null;try{localStorage.removeItem(SES)}catch(e){}location.href="index.html"}


/* ---------- AUTH ---------- */
function authView(){const reg=S.mode==="reg",st=S.role==="student",guides=db.users.filter(u=>u.role==="guide");
return `<div class="card"><h2>${reg?"Register":"Log in"} as</h2><div class="gates">${(reg?["student","reviewer","coordinator"]:["student","guide","reviewer","coordinator"]).map(r=>`<button class="gb ${S.role===r?"on":""}" onclick="S.role='${r}';render()">${r[0].toUpperCase()+r.slice(1)}</button>`).join("")}</div></div>
<div class="card"><div class="row"><h2>${reg?"Create account":"Welcome back"}</h2><button class="btn sm out" onclick="location.href='${reg?"login":"register"}.html'">${reg?"Log in instead":"Register instead"}</button></div>
${reg?`<label>Full name</label><input id="n">`:""}<label>Email</label><input id="e" type="email"><label>Password</label><input id="p" type="password">
${reg&&st?`<h3>Team details</h3><label>Team name</label><input id="tn"><label>Team members (comma separated)</label><input id="tm" ><label>Project title</label><input id="pt">
<div class="g2"><div><label>Division</label><input id="dv"></div><div><label>Team number</label><input id="no"></div></div>
<label>Guide</label><select id="gd"><option value="">Select guide…</option>${guides.map(g=>`<option value="${esc(g.email)}">${esc(g.name)}</option>`).join("")}</select>
<p class="mut">Joining an existing team? Use the exact same team name.</p>`:""}
<div class="err">${esc(S.err)}</div><button class="btn" style="width:100%" onclick="${reg?"doReg()":"doLogin()"}">${reg?"Register":"Log in"}</button>
${reg?"":`<p class="mut">Demo (password 1234): reviewer@demo.com · coord@demo.com. Guides: log in with your college email. Students: register first.</p>`}</div>`}
function doLogin(){const u=db.users.find(u=>u.email===v("e").toLowerCase()&&u.pw===$("p").value&&u.role===S.role);
 if(!u){S.err="No matching account for this role. Check email/password or register.";return render()}
 ses=u.email;try{localStorage.setItem(SES,ses)}catch(e){}location.href=HOME[u.role]}
function doReg(){const email=v("e").toLowerCase(),pw=$("p").value,name=v("n");S.err="";
 if(S.role==="guide")return fail("Guides cannot register. Please log in.");
 if(!name||!email||!pw)return fail("Name, email and password are required.");
 if(pw.length<4)return fail("Password must be at least 4 characters.");
 if(S.role==="student"&&!/^01fe\d{2}bcs\d{3}@kletech\.ac\.in$/.test(email))return fail("Enter college email id");
 if(db.users.some(u=>u.email===email))return fail("This email is already registered.");
 const u={email,pw,role:S.role,name};
 if(S.role==="student"){const tn=v("tn"),tm=v("tm"),pt=v("pt"),dv=v("dv"),no=v("no"),gd=v("gd");
  if(!tn||!tm||!pt||!dv||!no||!gd)return fail("Team name, members, project title, division, number and guide are all required.");
  let t=db.teams.find(t=>t.name.toLowerCase()===tn.toLowerCase());
  if(!t){t={id:"T"+(db.teams.length+1),name:tn,title:pt,members:[],div:dv,no,guide:gd};db.teams.push(t)}
  tm.split(",").map(s=>s.trim()).filter(Boolean).concat(name).forEach(m=>{if(!t.members.includes(m))t.members.push(m)});u.team=t.id}
 db.users.push(u);save();ses=email;try{localStorage.setItem(SES,ses)}catch(e){}location.href=HOME[u.role]}
function fail(m){S.err=m;render()}

/* ---------- STUDENT ---------- */
/* ---------- FILE STORAGE (IndexedDB: real files, no 1.2 MB limit) ---------- */
const IDB=()=>new Promise((res,rej)=>{const r=indexedDB.open("gatetrack_files",1);r.onupgradeneeded=()=>r.result.createObjectStore("f");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function putBlob(k,b){const d=await IDB();return new Promise((res,rej)=>{const x=d.transaction("f","readwrite");x.objectStore("f").put(b,k);x.oncomplete=()=>res();x.onerror=()=>rej(x.error)})}
async function getBlobById(k){const d=await IDB();return new Promise((res,rej)=>{const q=d.transaction("f").objectStore("f").get(k);q.onsuccess=()=>res(q.result||null);q.onerror=()=>rej(q.error)})}
async function fileBlob(sid,i){const s=db.subs.find(x=>x.id===sid),f=s&&s.files[i];if(!f)return null;
 if(f.fid)return getBlobById(f.fid);if(f.data)return (await fetch(f.data)).blob();return null}

/* ---------- STUDENT FILE UPLOAD ---------- */
async function submitFiles(){const u=user(),t=myTeam(u),fs=[...$("f").files];S.err=S.msg="";
 if(!t)return fail("Team not found.");
 if(!t.guide)return fail("No guide is assigned to your team.");
 if(!fs.length)return fail("Attach at least one document or PPT. Empty submissions are not sent to your guide.");
 const bad=fs.find(f=>f.size===0);if(bad)return fail(`"${bad.name}" is empty — it was not sent to your guide.`);
 const bx=fs.find(f=>!OK.includes(f.name.split(".").pop().toLowerCase()));if(bx)return fail(`"${bx.name}": only PDF, DOC, DOCX, PPT, PPTX are allowed.`);
 const big=fs.find(f=>f.size>25*1048576);if(big)return fail(`"${big.name}" is larger than 25 MB.`);
 const l=lastSub(t.id,S.gate);if(l&&l.status==="pending")return fail("Your "+S.gate+" submission is still waiting for the guide.");
 if(l&&l.status==="approved")return fail(S.gate+" is already approved by your guide.");
 try{const sid="S"+Date.now(),files=[];
  for(let i=0;i<fs.length;i++){const fid=sid+"_"+i;await putBlob(fid,fs[i]);files.push({name:fs[i].name,size:fs[i].size,fid})}
  db.subs.push({id:sid,team:t.id,guideEmail:t.guide,student:u.name,gate:S.gate,files,status:"pending",ts:Date.now(),v:db.subs.filter(s=>s.team===t.id&&s.gate===S.gate).length+1});
  save();S.msg="Submitted — sent to your guide only.";render()}
 catch(e){fail("Could not save the file: "+e.message)}}

/* ---------- OPEN / DOWNLOAD / PREVIEW ---------- */
const fl=(fs,sid)=>(fs||[]).map((f,i)=>{const ext=f.name.split(".").pop().toLowerCase();
 if(!f.fid&&!f.data)return `<div class="sub"><b>${esc(f.name)}</b><br><span class="mut">This file’s content was not saved (uploaded with an older version). Ask the student to resubmit.</span></div>`;
 return `<div class="sub"><b>${esc(f.name)}</b> <span class="mut">${Math.max(1,Math.round(f.size/1024))} KB</span><br>
 <button class="btn sm" onclick="openFile('${sid}',${i})">${ext==="docx"?"Preview":ext==="pdf"?"Open":"Open / download"}</button>
 <button class="btn sm out" onclick="downloadFile('${sid}',${i})">Download</button></div>`}).join("");
async function downloadFile(sid,i){try{const b=await fileBlob(sid,i);if(!b)return alert("File content not found in this browser.");
 const s=db.subs.find(x=>x.id===sid),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=s.files[i].name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}catch(e){alert("Could not open file: "+e.message)}}
async function openFile(sid,i){const s=db.subs.find(x=>x.id===sid),ext=s.files[i].name.split(".").pop().toLowerCase();
 if(ext==="docx")return previewDocx(sid,i);
 if(ext==="pdf"){const w=window.open("","_blank");try{const b=await fileBlob(sid,i);if(!b){w&&w.close();return alert("File content not found in this browser.")}
  const url=URL.createObjectURL(new Blob([b],{type:"application/pdf"}));if(w)w.location=url;else downloadFile(sid,i)}catch(e){w&&w.close();alert(e.message)}return}
 downloadFile(sid,i)}
async function previewDocx(sid,i){
 if(typeof mammoth==="undefined"||typeof DOMPurify==="undefined"){alert("Preview needs an internet connection — downloading the file instead.");return downloadFile(sid,i)}
 const b=await fileBlob(sid,i);if(!b)return alert("File content not found in this browser.");
 closeDocxPreview();const m=document.createElement("div");m.id="docPreview";
 m.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;justify-content:center;align-items:center;padding:16px";
 m.innerHTML=`<div style="background:#fff;color:#222;width:100%;max-width:1000px;height:90vh;border-radius:12px;display:flex;flex-direction:column;overflow:hidden"><div style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd"><b>${esc(db.subs.find(x=>x.id===sid).files[i].name)}</b><span><button class="btn sm out" onclick="downloadFile('${sid}',${i})">Download</button> <button class="btn sm bad" onclick="closeDocxPreview()">Close</button></span></div><div id="docPreviewContent" style="padding:24px;overflow:auto;flex:1">Loading…</div></div>`;
 document.body.appendChild(m);const c=document.getElementById("docPreviewContent");
 try{const r=await mammoth.convertToHtml({arrayBuffer:await b.arrayBuffer()});c.innerHTML=DOMPurify.sanitize(r.value)||"<i>This document has no readable text.</i>";c.querySelectorAll("img").forEach(x=>x.style.maxWidth="100%")}
 catch(e){c.textContent="Unable to preview this document. Please download it instead."}}
function closeDocxPreview(){const m=document.getElementById("docPreview");if(m)m.remove()}

function studentView(u){const t=myTeam(u);
 if(!t)return'<div class="card">No team found.</div>';
 const gb=`<div class="gates">${GATES.map(g=>`<button class="gb ${S.gate===g?"on":""}" onclick="S.gate='${g}';S.err=S.msg='';render()">${g}</button>`).join("")}</div>`;
 if(S.tab==="submit"){const l=lastSub(t.id,S.gate),ms=db.msgs.filter(m=>m.team===t.id&&m.gate===S.gate);
  return `<div class="card"><h2>${esc(t.name)} — ${esc(t.title)}</h2><p class="mut">Div ${esc(t.div)} · No. ${esc(t.no)} · Members: ${esc(t.members.join(", "))}</p>
  <label>Select gate</label>${gb}<label>Upload documents / PPT for ${S.gate}</label><input id="f" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx">
  <div class="err">${esc(S.err)}</div><div class="okm">${esc(S.msg)}</div><button class="btn" onclick="submitFiles()">${l&&l.status==="correction"?"Resubmit":"Submit"} to guide</button></div>
  <div class="card"><h2>${S.gate} status</h2>${l?`${pill(l.status)} <span class="mut">v${l.v} · ${fmt(l.ts)}</span><p>${fl(l.files,l.id)}</p>`:'<p class="mut">Nothing submitted yet.</p>'}
  ${ms.map(m=>`<div class="sub"><b>Guide message</b> <span class="mut">${fmt(m.ts)}</span><br>${esc(m.text)}</div>`).join("")}</div>`}
 if(S.tab==="progress"){return `<div class="card"><h2>Progress — ${esc(t.name)}</h2><div class="tw"><table><tr><th>Gate</th><th>Guide</th><th>Review</th><th>Next</th></tr>${GATES.map((g,i)=>{
  const s=lastSub(t.id,g),r=db.revs.filter(x=>x.team===t.id&&x.gate===g).slice(-1)[0];
  return `<tr><td><b>${g}</b></td><td>${s?pill(s.status):"—"}</td><td>${r?`${esc(r.score)}/10`:"—"}</td><td>${!s?"Submit files":s.status==="correction"?"Fix & resubmit":s.status==="pending"?"Wait for guide":r?"Reviewed ✓":"Ready for review day"}</td></tr>`}).join("")}</table></div></div>`}
 if(S.tab==="msgs"){const ms=db.msgs.filter(m=>m.team===t.id).reverse();
  return `<div class="card"><h2>Messages from guide</h2>${ms.map(m=>`<div class="sub"><b>${m.gate}</b> · <span class="mut">${esc(m.by)} · ${fmt(m.ts)}</span><br>${esc(m.text)}</div>`).join("")||'<p class="mut">No messages.</p>'}</div>`}
 return sheet(t.id)}

/* ---------- GUIDE (only their teams) ---------- */
function decide(id,st){const s=db.subs.find(x=>x.id===id),txt=v("c"+id);
 if(st==="correction"&&!txt){S.err="Write the corrections before sending.";return render()}
 s.status=st;db.msgs.push({id:"M"+Date.now(),team:s.team,gate:s.gate,by:user().name,ts:Date.now(),text:st==="approved"?(txt||"Approved. You are ready for the review."):"Corrections needed: "+txt});
 S.err="";save();render()}
function guideView(u){
 if(S.tab==="sheet")return sheet();
 const ts=db.teams.filter(t=>t.guide===u.email).map(t=>t.id),ss=db.subs.filter(s=>ts.includes(s.team)||s.guideEmail===u.email).reverse();
 return `<div class="card"><h2>Submissions from your teams</h2><div class="err">${esc(S.err)}</div>${ss.map(s=>{const t=team(s.team);
  return `<div class="sub"><div class="row"><b>${esc(t.name)} · ${s.gate} · v${s.v}</b>${pill(s.status)}</div><div class="mut">${esc(t.title)} · Div ${esc(t.div)} · No. ${esc(t.no)} · ${esc(t.members.join(", "))}</div><p>${fl(s.files,s.id)}</p>
  ${s.status==="pending"?`<textarea id="c${s.id}" placeholder="Corrections (sent as a message to the team) or approval note"></textarea><div class="row"><button class="btn sm bad" onclick="decide('${s.id}','correction')">Needs correction</button><button class="btn sm good" onclick="decide('${s.id}','approved')">Approve</button></div>`:""}</div>`}).join("")||'<p class="mut">No submissions yet.</p>'}</div>`}

/* ---------- REVIEWER ---------- */
function saveRev(){const t=team(S.rt),sc=v("sc"),ob=v("ob");
 if(!t)return fail("Select a team.");if(!ob)return fail("Enter your observation.");
 if(sc===""||+sc<0||+sc>10)return fail("Score must be 0–10.");
 const s=lastSub(t.id,S.rg);if(!s||s.status!=="approved")return fail("This team’s "+S.rg+" submission isn’t approved by the guide yet.");
 db.revs.push({id:"R"+Date.now(),team:t.id,gate:S.rg,obs:ob,score:sc,by:user().name,ts:Date.now()});save();S.err="";S.msg="Saved to the review sheet.";S.rt=null;render()}
function reviewerView(){
 if(S.tab==="sheet")return sheet();
 if(!S.rg)return `<div class="card"><h2>Select review gate</h2><div class="gates">${GATES.map(g=>`<div class="sub" style="text-align:center;min-width:90px"><b>${g}</b><br><button class="btn sm" onclick="S.rg='${g}';S.rt=null;S.err=S.msg='';render()">Go</button></div>`).join("")}</div><div class="okm">${esc(S.msg)}</div></div>`;
 const t=team(S.rt);
 return `<div class="card"><div class="row"><h2>${S.rg} — Evaluation</h2><button class="btn sm out" onclick="S.rg=null;render()">← Gates</button></div>
 <label>Team</label><select onchange="S.rt=this.value;S.err='';render()"><option value="">Select team…</option>${db.teams.map(x=>{const s=lastSub(x.id,S.rg);return`<option value="${x.id}" ${x.id===S.rt?"selected":""}>${esc(x.name)} — Div ${esc(x.div)} / No. ${esc(x.no)}${s&&s.status==="approved"?"":" (not approved)"}</option>`}).join("")}</select>
 ${t?`<div class="g2"><div><label>Division</label><input readonly value="${esc(t.div)}"></div><div><label>Team number</label><input readonly value="${esc(t.no)}"></div></div>
 <label>Project title / problem statement</label><input readonly value="${esc(t.title)}"><p class="mut">Members: ${esc(t.members.join(", "))}</p>
 <label>Observation</label><textarea id="ob" placeholder="Feedback, corrections, remarks…"></textarea><label>Score (0–10)</label><input id="sc" type="number" min="0" max="10">
 <div class="err">${esc(S.err)}</div><button class="btn" onclick="saveRev()">Save to review sheet</button>
 <h3>Earlier entries for ${S.rg}</h3>${db.revs.filter(r=>r.team===t.id&&r.gate===S.rg).map(r=>`<div class="sub"><b>${esc(r.score)}/10</b> · ${esc(r.by)}<br>${esc(r.obs)}</div>`).join("")||'<p class="mut">None yet.</p>'}`:`<div class="err">${esc(S.err)}</div>`}</div>`}

/* ---------- COORDINATOR ---------- */
function coordView(){if(S.tab==="sheet")return sheet();
 return `<div class="card"><h2>All teams — monitor</h2><div class="tw"><table><tr><th>Team</th><th>Title</th><th>Guide</th>${GATES.map(g=>`<th>${g}</th>`).join("")}</tr>${db.teams.map(t=>{const gd=db.users.find(u=>u.email===t.guide);
 return `<tr><td>${esc(t.name)}<br><span class="mut">Div ${esc(t.div)} · No. ${esc(t.no)}</span></td><td>${esc(t.title)}</td><td>${esc(gd?.name||"—")}</td>${GATES.map(g=>{const s=lastSub(t.id,g),r=db.revs.some(x=>x.team===t.id&&x.gate===g);return`<td>${r?"✅":s?pill(s.status):"—"}</td>`}).join("")}</tr>`}).join("")||'<tr><td colspan="9" class="mut">No teams registered yet.</td></tr>'}</table></div>
 <p class="mut">✅ = reviewed. Documents go to guides only; coordinators see status and observations.</p></div>`}

/* ---------- SHARED SHEET ---------- */
function sheet(tid){const rs=db.revs.filter(r=>!tid||r.team===tid).reverse();
 return `<div class="card"><h2>Review observation sheet</h2><p class="mut">Visible to students, guides, reviewers and coordinators.</p><div class="tw"><table><tr><th>Gate</th><th>Team</th><th>Div/No.</th><th>Project</th><th>Observation</th><th>Score</th><th>Reviewer</th><th>Date</th></tr>
 ${rs.map(r=>{const t=team(r.team);return`<tr><td>${r.gate}</td><td>${esc(t.name)}</td><td>${esc(t.div)}/${esc(t.no)}</td><td>${esc(t.title)}</td><td>${esc(r.obs)}</td><td>${esc(r.score)}</td><td>${esc(r.by)}</td><td>${fmt(r.ts)}</td></tr>`}).join("")||'<tr><td colspan="8" class="mut">No reviews recorded yet.</td></tr>'}</table></div></div>`}

/* ---------- SHELL ---------- */
const HOME={student:"student-submit.html",guide:"guide.html",reviewer:"reviewer.html",coordinator:"coordinator.html"};
const NAV={student:[["student-submit.html","Submit","submit"],["student-progress.html","Progress","progress"],["student-messages.html","Messages","msgs"],["review-sheet.html","Review sheet","sheet"]],guide:[["guide.html","Submissions","subs"],["review-sheet.html","Review sheet","sheet"]],reviewer:[["reviewer.html","Gate review","rev"],["review-sheet.html","Review sheet","sheet"]],coordinator:[["coordinator.html","Overview","ov"],["review-sheet.html","Review sheet","sheet"]]};
const VIEWS={student:studentView,guide:guideView,reviewer:reviewerView,coordinator:coordView};
let PG={need:"any",tab:null};
function boot(need,tab){PG={need,tab};render()}
function render(){const u=user(),tb=$("tabs"),{need,tab}=PG;
 if(need==="auth"){if(u){location.replace(HOME[u.role]);return}$("app").innerHTML=authView();return}
 if(!u){location.replace("login.html");return}
 if(need!=="any"&&u.role!==need){location.replace(HOME[u.role]);return}
 S.tab=tab;$("who").textContent=u.name+" \u00b7 "+u.role;$("lo").style.display="";
 tb.innerHTML=NAV[u.role].map(t=>`<a class="tab ${t[2]===tab?"on":""}" href="${t[0]}">${t[1]}</a>`).join("");
 $("app").innerHTML=VIEWS[u.role](u)}
