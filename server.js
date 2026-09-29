const http=require('http'),fs=require('fs'),path=require('path'),WebSocket=require('ws');
const PORT=process.env.PORT||3000, INDEX=fs.readFileSync(path.join(__dirname,'public/index.html'));
const Q=[
['Which keyword is used to define a function in Python?',['func','define','def','function'],2],
['Which symbol starts a comment in Python?',['//','#','<!--','**'],1],
['What is the output of print(2 + 3 * 2)?',['10','12','8','7'],2],
['Which data type stores True or False?',['String','Boolean','Float','List'],1],
['Which brackets create a Python list?',['()','{}','[]','<>'],2],
['Which function gets the length of a list?',['size()','count()','len()','length()'],2],
['What does IDE stand for?',['Integrated Development Environment','Internet Data Engine','Internal Design Editor','Integrated Digital Extension'],0],
['Which loop iterates over a sequence?',['repeat','for','loop','iterate'],1],
['Which operator is used for exponentiation?',['^','//','**','%%'],2],
['What is type(10)?',['str','float','int','number'],2],
['Which method adds one item to the end of a list?',['add()','push()','append()','insertEnd()'],2],
['Which keyword handles exceptions?',['try','check','error','catch'],0],
['Which value represents an empty Python value?',['empty','null','None','zero'],2],
['Which statement makes a decision?',['if','when','case','select'],0],
['Python files normally use which extension?',['.py','.python','.pt','.p'],0]
];
const rooms=new Map();
const send=(w,d)=>w.readyState===WebSocket.OPEN&&w.send(JSON.stringify(d));
const broadcast=(r,d)=>{send(r.host.ws,d);for(const p of r.players.values())send(p.ws,d)};
const state=r=>({type:'state',players:[...r.players.values()].map(p=>({name:p.name,score:p.score})),started:r.started});
function code(){let s='';const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';do{s='';for(let i=0;i<4;i++)s+=c[Math.floor(Math.random()*c.length)]}while(rooms.has(s));return s}
function next(r){clearTimeout(r.timer);r.index++;r.answers.clear();if(r.index>=Q.length){r.started=false;const b=[...r.players.values()].map(p=>({name:p.name,score:p.score})).sort((a,b)=>b.score-a.score);broadcast(r,{type:'finished',leaderboard:b});return}const q=Q[r.index];broadcast(r,{type:'question',index:r.index,total:Q.length,q:q[0],a:q[1],seconds:20});r.timer=setTimeout(()=>next(r),20000)}
const server=http.createServer((req,res)=>{if(req.url==='/'||req.url==='/index.html'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'});return res.end(INDEX)}res.writeHead(404);res.end('Not found')});
const wss=new WebSocket.Server({server});
wss.on('connection',ws=>{ws.id=Math.random().toString(36).slice(2);ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}
if(m.type==='create'){const c=code(),r={code:c,host:{ws,name:String(m.name||'Host').slice(0,24)},players:new Map(),started:false,index:-1,timer:null,answers:new Map()};rooms.set(c,r);ws.room=c;ws.role='host';send(ws,{type:'created',code:c});send(ws,state(r));return}
if(m.type==='join'){const c=String(m.code||'').toUpperCase(),r=rooms.get(c);if(!r)return send(ws,{type:'error',message:'Room not found.'});if(r.started)return send(ws,{type:'error',message:'Quiz already started.'});r.players.set(ws.id,{id:ws.id,ws,name:String(m.name||'Player').trim().slice(0,24)||'Player',score:0});ws.room=c;ws.role='player';send(ws,{type:'joined',code:c});broadcast(r,state(r));return}
const r=rooms.get(ws.room);if(!r)return;if(m.type==='start'&&ws.role==='host'){r.started=true;r.index=-1;for(const p of r.players.values())p.score=0;broadcast(r,{type:'countdown',seconds:3});setTimeout(()=>next(r),3000)}
if(m.type==='answer'&&ws.role==='player'&&r.started){if(r.answers.has(ws.id))return;const p=r.players.get(ws.id),q=Q[r.index];if(!p||!q)return;r.answers.set(ws.id,true);if(Number(m.answer)===q[2])p.score++;send(ws,{type:'answerResult',score:p.score});broadcast(r,state(r))}}
);ws.on('close',()=>{const r=rooms.get(ws.room);if(!r)return;if(ws.role==='host'){clearTimeout(r.timer);broadcast(r,{type:'error',message:'Host left. Room closed.'});rooms.delete(r.code)}else{r.players.delete(ws.id);broadcast(r,state(r))}})});
server.listen(PORT,'0.0.0.0',()=>console.log('Cinematic Quiz running on port '+PORT));
