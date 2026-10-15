/**
 * Qywam Shared Blob Engine
 * Reusable WebGL liquid-glass lens blob scene & shaders
 */
(function(root) {
  // px layout from the logo file: centre x, centre y, semi-axes a, b, angle (deg)
  const L = [
    [138, 161, 118, 84, -62],
    [116, 357, 82, 60, 12],
    [290, 184, 76, 38, 100],
    [252, 316, 44, 35, 75],
    [327, 293, 37, 21, 68],
    [297, 376, 29, 19, 55],
    [223, 418, 38, 30, 40],
    [324, 403, 17, 9, 60]
  ];

  const S = 0.0135, CX = 191, CY = 250;
  const ORDER = [0, 1, 2, 3, 6, 4, 5, 7];
  const SLOT = L.map((_, i) => ORDER.indexOf(i));

  // Math easing helpers
  const cl = t => Math.max(0, Math.min(1, t));
  const ss = t => { t = cl(t); return t * t * (3 - 2 * t); };
  const sq = t => { t = cl(t); return t * t * t * (t * (t * 6 - 15) + 10); };

  // Shader color palette: Gold -> Orange -> Pink -> Blue -> Gold
  const PAL = `vec3 pal(float t){float s=fract(t)*4.;vec3 a=vec3(1.,.82,.1),b=vec3(1.,.3,.06),c=vec3(1.,.2,.55),d=vec3(.08,.28,1.);
vec3 x=mix(a,b,smoothstep(0.,1.,s));x=mix(x,c,smoothstep(1.,2.,s));x=mix(x,d,smoothstep(2.,3.,s));return mix(x,a,smoothstep(3.,4.,s));}`;

  const NOISE = `float hs(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y);}`;

  const lensVS = `uniform float uT,uSeed,uWob;uniform vec3 uVel;varying vec3 vN,vO,vV;
float rip(vec3 p,float s){return sin(p.x*2.4+uT*1.05+s)*sin(p.y*2.1-uT*.85+s*2.1)*.55+sin((p.x-p.y)*3.6+uT*1.55+s*3.3)*.3+sin(p.y*5.2+p.x*1.3+uT*2.1+s)*.15;}
void main(){vec3 p=position;float s=uSeed*1.37;
 float n=rip(p,s);p+=normal*n*uWob;
 float vl=length(uVel);if(vl>1e-4){vec3 vd=uVel/vl;float t=dot(position,vd);p+=uVel*(t-1.)*.5;p-=vd*vl*.12*(1.-t*t);}
 vec3 e=vec3(.04,0.,0.);vec3 g=vec3(rip(p+e.xyy,s)-n,rip(p+e.yxy,s)-n,0.)/.04;
 vec3 nn=normalize(normal-g*uWob*.9);
 vO=position;vN=normalize(normalMatrix*nn);vec4 mv=modelViewMatrix*vec4(p,1.);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`;

  const lensFS = `precision highp float;uniform float uT,uSeed,uHi,uAl,uFog,uColorOffset;varying vec3 vN,vO,vV;${PAL}
${NOISE}
void main(){vec3 N=normalize(vN),V=normalize(vV);vec2 pn=vO.xy;float sd=uSeed*1.7+.3;
 vec2 w=pn+.5*(vec2(nz(pn*1.7+vec2(uT*.17,sd)),nz(pn*1.7+vec2(sd*2.3,-uT*.15)))-.5);
 w+=.25*(vec2(nz(w*3.1-uT*.11),nz(w*3.1+7.7+uT*.09))-.5);
 float T1=(dot(w,vec2(cos(sd*2.),sin(sd*2.)))*.5+.5)*.9+sd*.3;
 float n=nz(w*1.4+vec2(0.,uT*.2)+sd)*.6+nz(w*2.8+uT*.14)*.25;
 vec3 c=pal(T1+n*.6+uT*.05+N.x*.55+N.y*.4+uColorOffset);
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

  function createLensGeometry(widthSegs = 96, heightSegs = 64) {
    return new THREE.SphereGeometry(1, widthSegs, heightSegs);
  }

  function createBlobMeshes(scene, sharedTimeUniform, geo) {
    const geometry = geo || createLensGeometry();
    const meshes = L.map((_, i) => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uT: sharedTimeUniform,
          uSeed: { value: i },
          uHi: { value: 0 },
          uAl: { value: 1 },
          uFog: { value: 0 },
          uWob: { value: 0.03 },
          uColorOffset: { value: 0.0 },
          uVel: { value: new THREE.Vector3() }
        },
        vertexShader: lensVS,
        fragmentShader: lensFS,
        transparent: true
      });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.renderOrder = 2;
      mesh.frustumCulled = false;
      mesh.userData = {
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        s: new THREE.Vector3(),
        sv: new THREE.Vector3(),
        w: 0,
        om: 5.2 + ((i * 37) % 7) * 0.35,
        init: false
      };
      if (scene) scene.add(mesh);
      return mesh;
    });
    return meshes;
  }

  root.QywamBlobs = {
    L,
    S,
    CX,
    CY,
    ORDER,
    SLOT,
    cl,
    ss,
    sq,
    PAL,
    NOISE,
    lensVS,
    lensFS,
    createLensGeometry,
    createBlobMeshes
  };
})(typeof window !== 'undefined' ? window : this);
