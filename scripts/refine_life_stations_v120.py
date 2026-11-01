from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/survivorLife.js'
s=p.read_text()
needle="const mesh=(p,geometry,mat,pos)=>"
insert='''// PBR fabrics, weathered wood and oxidised fittings for the *actual* interactive furniture.
const textureLoader=new THREE.TextureLoader();
for(const [key,stem] of [['wood','reclaimed_wood'],['cloth','tarp_canvas'],['rust','galvanized_rust']]){
 const material=MAT[key],base='./assets/materials/advanced/'+stem;
 textureLoader.load(base+'_albedo.jpg',t=>{
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.repeat.set(1.8,1.8);t.anisotropy=4;material.map=t;
  material.color.set('#ffffff');material.needsUpdate=true;
 },undefined,()=>{});
 textureLoader.load(base+'_normal.jpg',t=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.8,1.8);material.normalMap=t;material.normalScale.set(.27,.27);material.needsUpdate=true;},undefined,()=>{});
}
'''
s=s.replace(needle,insert+needle)
needle="function chair(parent,x,y,z,rotation=0){"
insert='''function curvePipe(parent,points,radius,mat){
 const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));
 return mesh(parent,new THREE.TubeGeometry(curve,Math.max(12,points.length*7),radius,7,false),mat,[0,0,0]);
}
function hardware(parent,at,material=MAT.steel,r=.055){
 return mesh(parent,new THREE.SphereGeometry(r,9,6),material,at);
}
function saggingCanvas(p,width,depth,y,material){
 const nx=8,nz=6,positions=[],uvs=[],indices=[];
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/nz;
  const sag=.085*Math.sin(Math.PI*u)*Math.sin(Math.PI*v);
  positions.push((u-.5)*width,y-sag,(v-.5)*depth);
  uvs.push(u,v);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
  const n=j*(nx+1)+i;indices.push(n,n+1,n+nx+1,n+1,n+nx+2,n+nx+1);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();
 const m=material.clone();m.side=THREE.DoubleSide;
 return mesh(p,g,m,[0,0,0]);
}
'''
s=s.replace(needle,insert+needle)
s=s.replace("box(g,[1.45,.16,1.04],[0,.86,0],MAT.leather);box(g,[1.55,1.1,.12],[0,1.52,-.52],MAT.cloth);",
"""box(g,[1.45,.065,1.04],[0,.85,0],MAT.leather);
 saggingCanvas(g,1.32,.89,.91,MAT.cloth);
 box(g,[1.51,1.03,.06],[0,1.52,-.52],MAT.cloth);
 for(const side of [-1,1]){
  curvePipe(g,[[side*.66,.85,-.43],[side*.66,.84,0],[side*.66,.85,.45]],.035,MAT.steel);
  curvePipe(g,[[side*.70,1.02,-.55],[side*.71,1.50,-.57],[side*.70,1.95,-.55]],.037,MAT.steel);
  for(const z of [-.40,.37])hardware(g,[side*.61,.87,z],MAT.rust,.052);
  hardware(g,[side*.72,1.8,-.55],MAT.steel,.06);
 }
 // Folding X frames and weathered canvas backrest stitching.
 for(const side of [-1,1]){
  tube(g,[side*.53,.14,-.51],[side*.57,.85,.47],.04,MAT.steel);
  tube(g,[side*.59,.12,.52],[side*.53,.9,-.50],.04,MAT.rust);
 }
 for(const h of [1.18,1.78])box(g,[1.38,.019,.076],[0,h,-.466],MAT.leather);""")
s=s.replace("box(g,[3.3,.16,1.65],[0,1.12,0],MAT.wood);", """box(g,[3.3,.16,1.65],[0,1.12,0],MAT.wood);
 for(let i=0;i<4;i++){
  const x=-1.22+i*.81;box(g,[.008,.006,1.60],[x,1.206,0],MAT.leather);
 }
 for(const x of [-1.45,1.45])for(const z of [-.69,.69])hardware(g,[x,1.215,z],MAT.rust,.032);""")
s=s.replace("mesh(g,new THREE.CylinderGeometry(.31,.27,.095,18),MAT.steel,[-.85,1.27,0]);", """mesh(g,new THREE.CylinderGeometry(.31,.27,.095,22),MAT.steel,[-.85,1.27,0]);
 mesh(g,new THREE.TorusGeometry(.33,.025,7,25),MAT.steel,[-.85,1.32,0]).rotation.x=Math.PI/2;
 for(let i=0;i<5;i++){
  const a=i*6.283/5;
  hardware(g,[-.85+Math.cos(a)*.13,1.326,Math.sin(a)*.13],MAT.leather,.04);
 }
 // Field cup and simple spoon, attached to tabletop for a believable eating location.
 const cup=mesh(g,new THREE.CylinderGeometry(.14,.12,.28,16),MAT.steel,[.38,1.38,.12]);
 mesh(g,new THREE.TorusGeometry(.085,.022,5,12),MAT.steel,[.57,1.44,.13]).rotation.y=Math.PI/2;
 curvePipe(g,[[.58,1.22,-.22],[.72,1.24,-.24],[.87,1.27,-.26]],.016,MAT.steel);""")
s=s.replace("const radio=box(g,[1.05,.52,.54],[-.48,1.45,0],MAT.rust);", """const radio=box(g,[1.05,.52,.54],[-.48,1.45,0],MAT.rust);
 // Raised screws, sun-faded rubber buttons and a real coiled receiver cable.
 for(const xx of [-.89,-.07])for(const yy of [1.27,1.62])hardware(g,[xx,yy,.285],MAT.steel,.031);
 for(let i=0;i<5;i++)box(g,[.063,.042,.016],[-.87+i*.145,1.405,.304],MAT.dark);
 const dial=mesh(g,new THREE.CylinderGeometry(.105,.105,.025,20),MAT.steel,[-.19,1.48,.307]);dial.rotation.x=Math.PI/2;
 curvePipe(g,[[-.16,1.48,.33],[-.01,1.58,.4],[.25,1.48,.4],[.39,1.59,.28]],.012,MAT.leather);""")
p.write_text(s)
