(function(){
// px layout from the logo file: centre x, centre y, semi-axes a,b, angle (deg)
const L=[[138,161,118,84,-62],[116,357,82,60,12],[290,184,76,38,100],[252,316,44,35,75],[327,293,37,21,68],[297,376,29,19,55],[223,418,38,30,40],[324,403,17,9,60]];
const S=0.0135,CX=191,CY=250;
// story copy is server-rendered in index.html (#story > article.sec); this script only enhances it
const ORDER=[0,1,2,3,6,4,5,7]; // biggest blob first, then down in size
const SLOT=L.map((_,i)=>ORDER.indexOf(i)); // blob -> position on the helix
const cl=t=>Math.max(0,Math.min(1,t)),ss=t=>{t=cl(t);return t*t*(3-2*t)};

// ---------- story text (words wrapped for staggered reveals)
const STORY=document.getElementById('story');
const texts=[...STORY.querySelectorAll('article.sec')].map(e=>{
 const h=e.querySelector('h2');
 h.setAttribute('aria-label',h.textContent.trim());
 h.innerHTML=h.textContent.trim().split(' ').map(w=>'<span class="w" aria-hidden="true"><span>'+w+'</span></span>').join(' ');
 return {el:e,w:[...e.querySelectorAll('.w>span')],rest:[e.querySelector('.idx'),e.querySelector('p'),e.querySelector('ul,.cta')],line:e.querySelector('.idx i'),o:-1}});
function setText(t,o){if(Math.abs(o-t.o)<.0015)return;t.o=o;const e=t.el;
 e.style.visibility=o>.002?'visible':'hidden';e.style.opacity=cl(o*2.2);if(o<=.002)return;
 t.w.forEach((w,k)=>{const p=ss((o-k*.035)/.55);w.style.transform='translateY('+((1-p)*108).toFixed(1)+'%)'});
 t.rest.forEach((r,n)=>{const p=ss((o-.12-n*.1)/.55);r.style.opacity=p;r.style.transform='translateY('+((1-p)*14).toFixed(1)+'px)'});
 t.line.style.transform='scaleX('+ss(o/.6).toFixed(3)+')';t.line.style.transformOrigin='left'}

const heroEl=document.querySelector('.hero'),bar=document.getElementById('bar'),cue=document.getElementById('cue');
const cv=document.getElementById('c');
let R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){document.getElementById('fallback').style.display='flex';return}
R.setPixelRatio(Math.min(devicePixelRatio,2));R.setClearColor(0x000000,0);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.1,100);scene.add(cam);
const grp=new THREE.Group();scene.add(grp);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const dUni=L.map(l=>new THREE.Vector3((l[0]-CX)*S,-(l[1]-CY)*S,(l[2]+l[3])/2*S*1.1));
const DZ=dUni.map(v=>v.z);

const PAL=`vec3 pal(float t){float s=fract(t)*4.;vec3 a=vec3(1.,.82,.1),b=vec3(1.,.3,.06),c=vec3(1.,.2,.55),d=vec3(.08,.28,1.);
vec3 x=mix(a,b,smoothstep(0.,1.,s));x=mix(x,c,smoothstep(1.,2.,s));x=mix(x,d,smoothstep(2.,3.,s));return mix(x,a,smoothstep(3.,4.,s));}`;
const NOISE=`float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}`;

// wireframe wave sheet
const W=15,H=9,NX=130,NY=80,pos=[];
for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const x=(i/NX-.5)*W*2,y=(j/NY-.5)*H*2;
 if(i<NX){pos.push(x,y,0,x+W*2/NX,y,0)}
 if(j<NY){pos.push(x,y,0,x,y+H*2/NY,0)}}
const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
const lu={uT:{value:0},uD:{value:dUni},uM:{value:new THREE.Vector2(99,99)},uMs:{value:0},uF:{value:0}};
const lm=new THREE.ShaderMaterial({uniforms:lu,transparent:true,depthWrite:false,
vertexShader:`uniform float uT,uMs;uniform vec3 uD[8];uniform vec2 uM;varying float vH,vG;varying vec2 vP;
void main(){vec2 p=position.xy;float h=sin(p.x*.32+uT*.9)*1.1+sin(p.y*.48-uT*.75+p.x*.1)*.8+sin((p.x-p.y)*.22+uT*.5)*1.1+sin(p.x*.7-p.y*.4+uT*1.2)*.25;float g=0.;
for(int i=0;i<8;i++){float d=length(p-uD[i].xy)/uD[i].z;h-=1.5*exp(-d*d*.7);g+=exp(-d*d*.5);}
float dm=length(p-uM);h+=uMs*.7*exp(-dm*dm*.3)*sin(dm*3.-uT*3.);
vH=h;vG=g;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,h,1.);}`,
fragmentShader:`precision highp float;uniform float uT,uF;varying float vH,vG;varying vec2 vP;${PAL}
void main(){vec3 c=vec3(.42);float e=1.-smoothstep(5.,15.,length(vP*vec2(.7,1.15)));
float a=(.05+.15*clamp(vG,0.,1.))*(.3+.7*e)*uF;gl_FragColor=vec4(c,a);}`});
const sheet=new THREE.LineSegments(lg,lm);sheet.frustumCulled=false;grp.add(sheet);

// ---------- liquid blobs as real 3D lenses. One renderer from the logo all the way through the sequence,
// so nothing ever swaps, cross-fades or ghosts.
// vertex: slow organic ripples on the surface + a jelly trail opposite to the blob's own velocity
const lensVS=`uniform float uT,uSeed,uWob;uniform vec3 uVel;varying vec3 vN,vO,vV;
float rip(vec3 p,float s){return sin(p.x*2.4+uT*1.05+s)*sin(p.y*2.1-uT*.85+s*2.1)*.55+sin((p.x-p.y)*3.6+uT*1.55+s*3.3)*.3+sin(p.y*5.2+p.x*1.3+uT*2.1+s)*.15;}
void main(){vec3 p=position;float s=uSeed*1.37;
 float n=rip(p,s);p+=normal*n*uWob;
 float vl=length(uVel);if(vl>1e-4){vec3 vd=uVel/vl;float t=dot(position,vd);p+=uVel*(t-1.)*.5;p-=vd*vl*.12*(1.-t*t);}
 // bend the normal with the ripple so highlights slide across the surface
 vec3 e=vec3(.04,0.,0.);vec3 g=vec3(rip(p+e.xyy,s)-n,rip(p+e.yxy,s)-n,0.)/.04;
 vec3 nn=normalize(normal-g*uWob*.9);
 vO=position;vN=normalize(normalMatrix*nn);vec4 mv=modelViewMatrix*vec4(p,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;
const lensFS=`precision highp float;uniform float uT,uSeed,uHi,uAl,uFog;varying vec3 vN,vO,vV;${PAL}
${NOISE}
void main(){vec3 N=normalize(vN),V=normalize(vV);vec2 pn=vO.xy;float sd=uSeed*1.7+.3;
 // domain-warped flow so the colour moves like liquid inside the lens
 vec2 w=pn+.5*(vec2(nz(pn*1.7+vec2(uT*.17,sd)),nz(pn*1.7+vec2(sd*2.3,-uT*.15)))-.5);
 w+=.25*(vec2(nz(w*3.1-uT*.11),nz(w*3.1+7.7+uT*.09))-.5);
 float T1=(dot(w,vec2(cos(sd*2.),sin(sd*2.)))*.5+.5)*.9+sd*.3;
 float n=nz(w*1.4+vec2(0.,uT*.2)+sd)*.6+nz(w*2.8+uT*.14)*.25;
 vec3 c=pal(T1+n*.6+uT*.05+N.x*.55+N.y*.4);
 float dk=smoothstep(.55,.85,nz(w*1.9+uT*.12+sd*3.))*smoothstep(.3,.95,length(pn));
 c=mix(c,vec3(.04,.04,.18),dk*.7);
 vec3 Lg=normalize(vec3(-.5,.55,.7));c*=.8+.34*max(dot(N,Lg),0.);
 float sp=pow(max(dot(N,normalize(Lg+V)),0.),70.);
 float sp2=pow(max(dot(N,normalize(normalize(vec3(.7,-.2,.6))+V)),0.),18.);
 float fr=pow(1.-max(dot(N,V),0.),2.2);
 c=mix(c,vec3(1.,.88,.92),fr*.45);c+=sp*.95+sp2*.12*vec3(.7,.8,1.);
 c+=(hs(gl_FragCoord.xy)-.5)*.03;
 c=mix(c,c*1.12+.05,uHi);
 c=mix(c,vec3(1.),uFog);
 gl_FragColor=vec4(c,uAl);}`;
const lensGeo=new THREE.SphereGeometry(1,96,64);
const lenses=L.map((_,i)=>{const m=new THREE.Mesh(lensGeo,new THREE.ShaderMaterial({uniforms:{uT:lu.uT,uSeed:{value:i},uHi:{value:0},uAl:{value:1},uFog:{value:0},uWob:{value:.03},uVel:{value:new THREE.Vector3()}},vertexShader:lensVS,fragmentShader:lensFS,transparent:true}));
 m.renderOrder=2;m.frustumCulled=false;scene.add(m);
 // spring state: every blob has a slightly different 'weight', so they never move in lockstep
 m.userData={p:new THREE.Vector3(),v:new THREE.Vector3(),s:new THREE.Vector3(),sv:new THREE.Vector3(),w:0,om:5.2+((i*37)%7)*.35,init:false};return m});
const BASE=dUni.map(v=>v.clone());
const discs=L.map((l,i)=>({ox:0,oy:0,px:0,py:0,s:1,ang:0,base:l[4]*Math.PI/180,ph:i*1.3}));

// ---------- the sequence path: an invisible helix the blobs travel along
const DR=1.7,SP=1.3,WT=.9,DD=11; // helix radius, rise per blob, twist per blob, distance from camera
const dnaRoot=new THREE.Group();cam.add(dnaRoot);dnaRoot.position.set(1,0,-DD);
const tilt=new THREE.Group();dnaRoot.add(tilt);
const helix=new THREE.Group();tilt.add(helix);
const SLOTS=L.map((_,k)=>new THREE.Vector3(DR*Math.sin(k*WT),-k*SP,DR*Math.cos(k*WT)));
const hu={uT:lu.uT,uOff:{value:new THREE.Vector3()},uScale:{value:1},uRev:{value:0},uVis:{value:0},uPS:{value:400},uLP:{value:0}};

// faint water particles: a loose, random mist that only hints at the sequence and drifts around the blobs
const NS=420,NC=22,pa=[],pk=[],rnd=Math.random;
for(let n=0;n<NS;n++){pa.push(rnd()*17-5,(rnd()<.5?0:Math.PI)+(rnd()-.5)*.7,.75+rnd()*.5,rnd());pk.push(-1)}
for(let k=0;k<8;k++)for(let n=0;n<NC;n++){pa.push((rnd()-.5)*1.7,rnd()*6.2832,1.05+rnd()*.7,rnd());pk.push(k)}
const pg=new THREE.BufferGeometry();
pg.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(pk.length*3),3));
pg.setAttribute('aP',new THREE.Float32BufferAttribute(pa,4));pg.setAttribute('aK',new THREE.Float32BufferAttribute(pk,1));
const mist=new THREE.Points(pg,new THREE.ShaderMaterial({uniforms:hu,transparent:true,depthWrite:false,
vertexShader:`uniform float uT,uLP,uPS,uVis,uScale,uRev;uniform vec3 uOff;attribute vec4 aP;attribute float aK;varying float vA;
float fadeA(vec3 mv){vec3 r=(mv-uOff)/uScale;float vy=1.-smoothstep(2.,4.4,abs(r.y));
 float dz=clamp(r.z/${DR.toFixed(2)}*.5+.5,0.,1.);float rv=1.-smoothstep(uRev-1.6,uRev,abs(r.y));return vy*rv*(.25+.75*dz);}
void main(){float s=aP.w;vec3 p;float WT=${WT.toFixed(2)},SP=${SP.toFixed(2)},DR=${DR.toFixed(2)};
 if(aK<0.){float u=aP.x+uT*(.04+.05*fract(s*7.31));u=mod(u+5.,17.)-5.;float a=u*WT+aP.y;float r=DR*aP.z;
  p=vec3(r*sin(a),-u*SP,r*cos(a))+.16*vec3(sin(uT*.37+s*41.),sin(uT*.29+s*23.),cos(uT*.33+s*17.));
 }else{vec3 c=vec3(DR*sin(aK*WT),-aK*SP,DR*cos(aK*WT));float q=abs(aK-uLP);float f=q<=1.?1.-.42*q:.58*pow(.86,q-1.);
  float th=aP.y+uT*(.1+.16*fract(s*3.7))*(fract(s*11.)>.5?1.:-1.);float ph=aP.x+.25*sin(uT*.3+s*9.);float r=aP.z*f*1.05;
  p=c+r*vec3(cos(th)*cos(ph),sin(ph)*.9,sin(th)*cos(ph)*.7);}
 vec4 mv=modelViewMatrix*vec4(p,1.);
 vA=fadeA(mv.xyz)*uVis*(.4+.6*fract(s*5.3))*(.7+.3*sin(uT*1.1+s*30.));
 gl_PointSize=(.016+.022*fract(s*13.7))*uScale*uPS/-mv.z;gl_Position=projectionMatrix*mv;}`,
fragmentShader:`precision highp float;varying float vA;
void main(){vec2 c=gl_PointCoord-.5;float d=length(c)*2.;if(d>1.)discard;
 float body=(1.-d)*.3,ring=smoothstep(.55,.9,d)*(1.-smoothstep(.9,1.,d)),spec=1.-smoothstep(0.,.4,length(c+vec2(.15,.15))*2.);
 vec3 col=mix(vec3(.4,.52,.7),vec3(1.),spec*.8);
 gl_FragColor=vec4(col,(body+ring*.8+spec*.25)*vA*.5);}`}));
mist.renderOrder=3;mist.frustumCulled=false;helix.add(mist);

// very soft colour aura behind the blob in focus
const aura=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({uniforms:{uT:lu.uT,uA:{value:0},uSeed:{value:0}},transparent:true,depthWrite:false,
 vertexShader:`varying vec2 vU;void main(){vU=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`precision highp float;uniform float uT,uA,uSeed;varying vec2 vU;${PAL}void main(){float r=length(vU);vec3 c=pal(atan(vU.y,vU.x)/6.2832+uT*.04+uSeed*.53);gl_FragColor=vec4(c,exp(-r*r*5.)*uA*.16);}`}));
aura.renderOrder=0;aura.frustumCulled=false;dnaRoot.add(aura);

// interaction
const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(9,9),hit=new THREE.Vector3();
let mx=0,my=0,tmx=0,tmy=0,lastMove=0;
function setNdc(e){ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);tmx=ndc.x;tmy=ndc.y;lastMove=performance.now()}
addEventListener('pointermove',setNdc);
const plane1=new THREE.Plane(new THREE.Vector3(0,0,1),-1),lp=new THREE.Vector3(99,99,0),inv=new THREE.Matrix4();
function pick(){ray.setFromCamera(ndc,cam);inv.copy(grp.matrixWorld).invert();const r2=ray.ray.clone().applyMatrix4(inv);if(r2.intersectPlane(plane1,hit))lp.copy(hit)}

let baseS=1,portrait=false,sh=0,sc=0,vs=0;
function resize(){const w=innerWidth,h=innerHeight;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();
 baseS=w/h>1?0.95:Math.max(.45,Math.min(.85,(w/h)*1.45));portrait=w<900||w/h<1.2;
 hu.uPS.value=R.getPixelRatio()*h/(2*Math.tan(20*Math.PI/180))}
addEventListener('resize',resize);resize();

const RANK=[7,6,5,4,2,1,3,0];
const Z=new THREE.Vector3(0,0,1),vA=new THREE.Vector3(),vB=new THREE.Vector3(),vC=new THREE.Vector3(),vD=new THREE.Vector3(),vT=new THREE.Vector3();
const qA=new THREE.Quaternion(),qB=new THREE.Quaternion(),qT=new THREE.Quaternion(),qZ=new THREE.Quaternion(),qI=new THREE.Quaternion(),hq=new THREE.Quaternion(),eu=new THREE.Euler();
const sq=t=>{t=cl(t);return t*t*t*(t*(t*6-15)+10)}; // smootherstep: zero velocity *and* acceleration at both ends
const clock=new THREE.Clock();let T=0,LPs=0;
function frame(){
 const dt=Math.min(clock.getDelta(),.05);T+=dt*(reduce?.25:1);
 lu.uT.value=T;
 mx+=(tmx-mx)*.04;my+=(tmy-my)*.04;
 cam.position.set(mx*.9,-4.6+my*.5,9);cam.lookAt(0,.2,0);

 // ---- scroll timeline: 0..1 logo -> sequence, then one blob per viewport, then back to the logo for the brief
 const k60=1-Math.pow(1-.055,dt*60); // frame-rate independent smoothing
 const scOld=sc;sc+=(Math.min(9.4,scrollY/innerHeight)-sc)*k60;vs+=((sc-scOld)/Math.max(dt,.001)-vs)*.15;
 const x=sc-1,xx=Math.max(0,x),jj=Math.floor(xx),LP=Math.min(7,jj+sq(((xx-jj)-.35)/.65));
 LPs+=(LP-LPs)*(1-Math.pow(1-.08,dt*60));
 const fromHero=sq((sc-.03)/.95),toEnd=sq((x-7.5)/.9);
 const cw=fromHero*(1-toEnd);
 sh+=(((sc>.12)?1:0)-sh)*(1-Math.pow(1-.04,dt*60));

 // Scale & placement for logo formations:
 // 1) Hero is slightly smaller than before so it doesn't clip on the screen edges
 const heroScale=baseS*(portrait?.78:.95);
 const heroPosY=portrait?.85:0;
 // 2) Final Drop a Brief blobs are big and prominent (not shrunken to 50%)
 const endScale=baseS*(portrait?.88:.95);
 const endPosY=portrait?1.15:0;

 const curScale=portrait?(heroScale+(endScale-heroScale)*sh):(baseS*(1-.05*sh));
 const curPosX=portrait?0:2.3*sh;
 const curPosY=portrait?(heroPosY+(endPosY-heroPosY)*sh):0;
 grp.scale.setScalar(curScale);
 grp.position.set(curPosX,curPosY,0);
 lu.uF.value=Math.min(1,T)*(1-.5*cw);

 // ---- sequence placement (camera space so it always faces the viewer)
 const hH=DD*Math.tan(20*Math.PI/180),hW=hH*cam.aspect,rs=portrait?.62:1;
 dnaRoot.position.set(portrait?0:Math.min(hW*.13,1.4),portrait?hH*.32:-.05,-DD);dnaRoot.scale.setScalar(rs);
 tilt.rotation.set(-my*.1+Math.sin(T*.31)*.025,0,(portrait?0:-.05)+mx*.03);
 const curSP=portrait?SP:SP*1.15;
  helix.position.y=LPs*curSP;helix.rotation.y=-LPs*WT+mx*.25+Math.sin(T*.23)*.05;
 hu.uOff.value.copy(dnaRoot.position);hu.uScale.value=rs;hu.uRev.value=ss(cw)*6.5;hu.uVis.value=ss((cw-.25)/.6);hu.uLP.value=LPs;
 const hold=cw*(1-cl(Math.abs(LPs-Math.round(LPs))*2.4));
 aura.position.set(0,-.1,DR-.9);aura.scale.setScalar(portrait?6.5:5.5);aura.material.uniforms.uA.value=hold;aura.material.uniforms.uSeed.value=ORDER[Math.round(LPs)];
 scene.updateMatrixWorld();
 pick();
 lu.uM.value.set(lp.x,lp.y);
 const moving=performance.now()-lastMove<120;lu.uMs.value+=((moving?1:0)-lu.uMs.value)*.06;
 const mv=(.3+.7*lu.uMs.value)*(1-cw);

 // ---- story text: nothing but the hero until the first blob is in front
 texts.forEach((t,j)=>setText(t,j<8?cl(1.6-Math.abs(x-(j+.2))*3.6):cl((x-7.8)*3.5)));
 heroEl.style.opacity=Math.max(0,1-sc*4);heroEl.style.transform='translateY('+(-sc*50).toFixed(1)+'px)';
 cue.style.opacity=Math.max(0,1-sc*5);bar.style.width=sc/9.4*100+'%';

 // ---- logo positions (drop-in, idle float, gentle push away from the cursor)
 discs.forEach((d,i)=>{const u=cl((T-.2-RANK[i]*.1)/.7),e=u*u*(3-2*u);
  d.s=(.85+.15*e)*(1+.025*Math.sin(T*1.1+d.ph));d.ang=d.base+Math.sin(T*.6+d.ph)*.03;
  const dx=lp.x-BASE[i].x,dy=lp.y-BASE[i].y,dist=Math.hypot(dx,dy)+.001,f=Math.exp(-dist*dist*.25)*.14*mv;
  d.ox+=(dx/dist*f-d.ox)*.06;d.oy+=(dy/dist*f-d.oy)*.06;
  d.px=BASE[i].x+d.ox+Math.sin(T*.45+d.ph)*.05;d.py=BASE[i].y+d.oy+Math.cos(T*.38+d.ph*1.4)*.045+8*Math.pow(1-u,3);
  dUni[i].set(d.px,d.py,DZ[i]*(1-cw)+.001)});

 // ---- each blob is pulled towards its pose by its own soft spring: weight, follow-through, a touch of overshoot
 helix.getWorldQuaternion(hq);const gs=grp.scale.x,h=dt/3,qk=1-Math.exp(-dt*5);
 lenses.forEach((m,i)=>{const d=discs[i],k=SLOT[i],u=k-LPs,q=Math.abs(u),U=m.material.uniforms,st=m.userData;
  const ei=sq(cw*1.25-k/7*.25);
  vA.set(d.px,d.py,1);grp.localToWorld(vA);qA.copy(grp.quaternion).multiply(qT.setFromAxisAngle(Z,d.ang));
  const lx=L[i][2]*S*d.s*gs,ly=L[i][3]*S*d.s*gs;
  vB.copy(SLOTS[k]);
  if(!portrait){vB.x*=1.1;vB.y*=1.15;vB.z*=1.1;}
  helix.localToWorld(vB);
  // idle drift so the sequence keeps breathing when you stop scrolling
  vB.x+=Math.sin(T*.47+d.ph)*.07;vB.y+=Math.cos(T*.39+d.ph*1.3)*.09;vB.z+=Math.sin(T*.31+d.ph*.7)*.06;
  const fo=1-Math.min(1,q);
  eu.set(-my*(.1+.22*fo)+Math.sin(T*.43+d.ph)*.06,k*WT-u*WT*.45+mx*(.12+.25*fo)+Math.cos(T*.37+d.ph)*.07,0);
  qB.copy(hq).multiply(qT.setFromEuler(eu)).multiply(qZ.setFromAxisAngle(Z,d.base+Math.sin(T*.4+d.ph)*.12));
  const f=q<=1?1-.65*q:.35*Math.pow(.75,q-1);
  const explainScale=portrait?1.48:1.55;
  const mm=explainScale*f/Math.max(L[i][2],L[i][3])*(1+.025*Math.sin(T*1.1+d.ph)),bx=L[i][2]*mm,by=L[i][3]*mm;
  vC.lerpVectors(vA,vB,ei);
  const sx=lx+(bx-lx)*ei,sy=ly+(by-ly)*ei;vD.set(sx,sy,.32*Math.min(sx,sy));
  qA.slerp(qB,ei);
  if(!st.init){st.p.copy(vC);st.s.copy(vD);m.quaternion.copy(qA);st.init=true}
  const om=st.om,so=om*1.35;
  for(let n=0;n<3;n++){
   st.v.addScaledVector(vT.subVectors(vC,st.p),om*om*h).multiplyScalar(1-2*.66*om*h);st.p.addScaledVector(st.v,h);
   st.sv.addScaledVector(vT.subVectors(vD,st.s),so*so*h).multiplyScalar(1-2*.5*so*h);st.s.addScaledVector(st.sv,h)}
  m.position.copy(st.p);m.scale.set(Math.max(.001,st.s.x),Math.max(.001,st.s.y),Math.max(.001,st.s.z));
  m.quaternion.slerp(qA,qk);
  // jelly: hand the blob's own velocity to the shader in its local space, so it trails and stretches like a drop
  vT.copy(st.v).multiplyScalar(.045);const ml=.45*Math.max(m.scale.x,m.scale.y);if(vT.length()>ml)vT.setLength(ml);
  vT.applyQuaternion(qI.copy(m.quaternion).invert());vT.set(cl((vT.x/m.scale.x+.7)/1.4)*1.4-.7,cl((vT.y/m.scale.y+.7)/1.4)*1.4-.7,cl((vT.z/m.scale.z+.7)/1.4)*1.4-.7);
  U.uVel.value.lerp(vT,.25);
  st.w+=((.028+.05*Math.min(1,st.v.length()*.3))-st.w)*.06;U.uWob.value=st.w;
  const back=(1-Math.cos(u*WT))/2,al=1-ei+ei*cl((3.7-q)/1.1);
  U.uAl.value=al;m.material.depthWrite=al>.6;m.visible=al>.003;
  U.uHi.value=ei*Math.max(0,1-q*1.6);
  U.uFog.value=ei*Math.min(.6,back*.32+Math.max(0,q-1)*.09)});

 R.render(scene,cam);requestAnimationFrame(frame);
}
frame();
})();
