/**
 * Lingchuan school gate and silver sculpture, modelled from archived photos.
 * No photograph is embedded. Dimensions are proportional estimates, not a survey.
 *
 * const api = { T, mat, materials }; // passing add/box/cyl/sphere/beam is harmless
 * root.add(buildGate(api));
 * const sculpture = buildSculpture(api); sculpture.position.set(...); root.add(sculpture);
 *
 * Both functions return an ordinary THREE.Group with ground centre at (0,0,0),
 * Y up. Gate +Z faces the campus garden; the guardhouse is on +X in that view.
 * Sculpture +Z is its principal photographed face, viewed from the gate.
 * No instancing, textures requiring new assets, runtime DOM, or external imports.
 */

function workshop(api, name) {
  const { T } = api;
  if (!T) throw new TypeError('Historical geometry needs api.T (Three.js).');
  const root = new T.Group(); root.name = name;
  const buckets = new Map();
  const registered = api.materials ?? {};
  let section = 'structure';
  function material(name, color, roughness, metalness = 0, texture = null) {
    const result = api.mat ? api.mat(name, color, roughness, texture, metalness)
      : new T.MeshStandardMaterial({ color, roughness, metalness });
    result.name = name;
    if (texture) result.userData.texture = texture;
    registered[name] = result;
    return result;
  }
  function add(geometry, material, position = [0,0,0], rotation = [0,0,0]) {
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    if (geometry.index) { const original = geometry; geometry = geometry.toNonIndexed(); original.dispose(); }
    const transform = new T.Matrix4().compose(new T.Vector3(...position), new T.Quaternion().setFromEuler(new T.Euler(...rotation)), new T.Vector3(1,1,1));
    geometry.applyMatrix4(transform);
    if(material.userData.texture&&!material.userData.explicitUV){
      const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
      const size=material.userData.texture==='paving'?4:material.userData.texture==='tile'?2.8:2;
      for(let i=0;i<p.count;i++)uv.setXY(i,(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/size,(Math.abs(n.getY(i))>.5?p.getZ(i):p.getY(i))/size);
    }
    const key = `${section}:${material.uuid}`;
    if (!buckets.has(key)) buckets.set(key, { section, material, geometries: [] });
    buckets.get(key).geometries.push(geometry);
  }
  function box(x,y,z,w,h,d,m) { add(new T.BoxGeometry(w,h,d),m,[x,y,z]); }
  function cyl(x,y,z,r,h,m,rTop=r,segments=20,rotation=[0,0,0]) { add(new T.CylinderGeometry(rTop,r,h,segments),m,[x,y,z],rotation); }
  function sphere(x,y,z,r,m,segments=32) { add(new T.SphereGeometry(r,segments,Math.ceil(segments/2)),m,[x,y,z]); }
  function beam(a,b,r,m,segments=10) {
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),direction=bv.clone().sub(av);
    const g=new T.CylinderGeometry(r,r,direction.length(),segments);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));
    add(g,m,av.add(bv).multiplyScalar(.5).toArray());
  }
  function flatBeam(a,b,w,d,m) {
    const av=new T.Vector3(...a),bv=new T.Vector3(...b),direction=bv.clone().sub(av);
    const g=new T.BoxGeometry(w,direction.length(),d);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));
    add(g,m,av.add(bv).multiplyScalar(.5).toArray());
  }
  function tube(points,r,m,segments=48,radialSegments=8) {
    add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),segments,r,radialSegments,false),m);
  }
  function custom(positions,indices,uv) {
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    if(uv)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function finish() {
    const groups=new Map();
    for(const {section,material,geometries} of buckets.values()) {
      if(!groups.has(section)){const group=new T.Group();group.name=section;root.add(group);groups.set(section,group);}
      const count=geometries.reduce((sum,g)=>sum+g.attributes.position.count,0);
      const p=new Float32Array(count*3),n=new Float32Array(count*3),uv=new Float32Array(count*2);
      let offset=0;
      for(const g of geometries){p.set(g.attributes.position.array,offset*3);n.set(g.attributes.normal.array,offset*3);uv.set(g.attributes.uv.array,offset*2);offset+=g.attributes.position.count;g.dispose();}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(p,3));geometry.setAttribute('normal',new T.BufferAttribute(n,3));geometry.setAttribute('uv',new T.BufferAttribute(uv,2));geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const mesh=new T.Mesh(geometry,material);mesh.name=`${section}_${material.name}`;mesh.castShadow=true;mesh.receiveShadow=true;groups.get(section).add(mesh);
    }
    root.updateMatrixWorld(true);
    return root;
  }
  return {T,root,material,add,box,cyl,sphere,beam,flatBeam,tube,custom,finish,part:name=>{section=name;}};
}

export function buildGate(api, { gateExtension = .42, includeApron = true, addressTexture = 'lingxi-road-44-plate' } = {}) {
  const w=workshop(api,'School_gate_unchanged');
  const {T,root,material,add,box,cyl,sphere,beam,flatBeam,tube,custom,part}=w;
  const roof=material('historic_gate_ivory_metal_panels','#d9dcd6',.48,.38);
  const steel=material('historic_gate_structural_steel','#a5aea9',.42,.72);
  const seams=material('historic_gate_sheet_joints','#858e87',.7,.3);
  const tile=material('historic_gate_limestone_tiles','#c9c5b5',.86,0,'tile');
  const stone=material('historic_gate_rough_ashlar','#acaa96',.94,0,'stone');
  const mortar=material('historic_gate_mortar','#8d9285',.94);
  const trim=material('historic_gate_cut_stone_edges','#d0d1c2',.74);
  const glass=material('historic_gate_old_tinted_glass','#375a60',.2,.45);
  const frame=material('historic_gate_aluminium_frames','#b6beb6',.34,.7);
  const shadow=material('historic_gate_recess_shadow','#263c37',.93);
  const chrome=material('historic_gate_stainless_steel','#c5cdc9',.26,.9);
  const rubber=material('historic_gate_wheels_and_gaskets','#29322e',.92);
  const motor=material('historic_gate_motor_cabinet','#505956',.43,.6);
  const red=material('historic_gate_red_safety_chevrons','#a23434',.5,.18);
  const blue=material('historic_gate_address_blue','#12548a',.57);
  const paint=material('historic_gate_address_white','#e1e5d7',.65);
  const address=addressTexture?material('historic_gate_2016_address_decal','#ffffff',.72,0,addressTexture):null;
  if(address){address.alphaTest=.45;address.userData.explicitUV=true;}
  const paving=material('historic_gate_apron_concrete','#c5c5b9',.96,0,'paving');
  const amber=material('historic_gate_indicator_amber','#c37c25',.38,.15);
  root.userData={historicalTarget:'Same school gate; user confirms unchanged from 2014–2017 through 2026',units:'metres, estimated',origin:'driveway ground centre; +Z campus side; guardhouse +X',estimatedDimensions:{canopySpan:29,canopyDepth:4.8,canopyApex:7.97,guardhouse:[5.6,3.82,6.6]},evidence:['20130427101954848.jpg','20130426165458150.jpg','20160827170299709970.jpg','user-video-2022/003.jpg','user-video-2022/004.jpg'],accuracy:'Photo-derived proportions; structural spacing and concealed faces inferred',addressPlate:'Lingxi Road 44, street-facing (-Z) guardhouse corner, photo 2016-08-26',gatePose:'Retractable gate pose is adjustable; default extended across the driveway as in the 2017-07-27 photograph',exclusions:['Temporary anniversary banners','Lanterns and celebration flags','Lettering uses readable school name; calligraphy shape is an approximation']};

  if(includeApron){part('Gate_ground_and_tracks');box(0,-.06,.65,31.6,.12,10.2,paving);for(const x of [-10.5,-5.2,0,5.2,10.5])box(x,.005,.65,.015,.009,10.1,mortar);}
  part('Gate_ground_and_tracks');
  for(const z of [-.32,.32]){box(-1.15,.018,z,23.8,.034,.033,chrome);box(-1.15,.007,z,23.95,.012,.1,shadow);}
  // Shallow cylindrical steel roof, thin skins and real exposed truss members.
  const halfSpan=14.5;
  // In the street view the roof rises from the left guardhouse (+X)
  // to the right pavilion (-X), then levels out. It is not a symmetric arch.
  const arch=x=>{const t=(halfSpan-x)/(2*halfSpan);return 4.92+3.2*(2*t-t*t);};
  const depth=x=>4.8-.65*Math.pow(Math.abs(x)/halfSpan,5);
  part('Gate_curved_roof_skin');
  const samples=80;
  function roofSurface(thickness,underside=false){const p=[],uv=[],idx=[];for(let i=0;i<=samples;i++){const x=-halfSpan+2*halfSpan*i/samples;for(const side of[-1,1]){p.push(x,arch(x)+thickness,side*depth(x)/2);uv.push(i*7,side<0?0:1);}}for(let i=0;i<samples;i++){const k=i*2;if(underside)idx.push(k,k+2,k+1,k+1,k+2,k+3);else idx.push(k,k+1,k+2,k+1,k+3,k+2);}add(custom(p,idx,uv),roof);}
  roofSurface(.06);roofSurface(-.065,true);
  for(const side of [-1,1]){
    const p=[],uv=[],idx=[];
    for(let i=0;i<=samples;i++){const x=-halfSpan+2*halfSpan*i/samples;for(const drop of[.06,-.88]){p.push(x,arch(x)+drop,side*depth(x)/2);uv.push(i/4,drop);}}
    for(let i=0;i<samples;i++){const k=i*2;if(side>0)idx.push(k,k+1,k+2,k+1,k+3,k+2);else idx.push(k,k+2,k+1,k+1,k+2,k+3);}add(custom(p,idx,uv),roof);
    tube(Array.from({length:33},(_,i)=>{const x=-halfSpan+2*halfSpan*i/32;return[x,arch(x)-.885,side*depth(x)/2];}),.025,seams,100,6);
  }
  for(const x of [-halfSpan,halfSpan])box(x,arch(x)-.4,0,.06,.94,depth(x),roof);
  // Raised seams read as individual sheet panels without oversized ridges.
  for(let x=-14.1;x<=14.2;x+=.68)box(x,arch(x)+.072,0,.015,.018,depth(x)-.03,seams);
  part('Gate_exposed_curved_trusses');
  const bays=18;
  for(const z of [-1.76,1.76]){
    for(const drop of [.42,.92])tube(Array.from({length:37},(_,i)=>{const x=-14.25+28.5*i/36;return[x,arch(x)-drop,z];}),drop===.42?.075:.058,steel,100,10);
    for(let i=0;i<bays;i++){
      const x0=-14.25+28.5*i/bays,x1=-14.25+28.5*(i+1)/bays;
      beam([x0,arch(x0)-.42,z],[x1,arch(x1)-.92,z],.028,steel,8);
      beam([x0,arch(x0)-.92,z],[x1,arch(x1)-.42,z],.028,steel,8);
      beam([x0,arch(x0)-.42,z],[x0,arch(x0)-.92,z],.035,steel,8);
    }
  }
  // Triangular space frame across the full underside, visible in the 2017 photo.
  for(let i=0;i<=18;i++){
    const x=-14.15+28.3*i/18;
    beam([x,arch(x)-.42,-2.05],[x,arch(x)-.42,2.05],.042,steel,8);
    if(i<18){const nx=x+28.3/18,mx=(x+nx)/2;
      for(let j=0;j<3;j++){const za=-1.8+j*1.2,zb=za+1.2,zm=(za+zb)/2;
        for(const xx of [x,nx])for(const zz of [za,zb])beam([xx,arch(xx)-.39,zz],[mx,arch(mx)-1.04,zm],.034,steel,6);
        beam([mx,arch(mx)-1.04,za],[mx,arch(mx)-1.04,zb],.031,steel,6);
      }
    }
  }
  part('Gate_forked_support_columns');
  // Two visible V-shaped supports spring from the right pavilion roof.
  for(const x of [-8.6,-4.1])for(const z of [-1.55,1.55]){
    const base=3.87;box(x,base+.08,z,.36,.16,.36,trim);cyl(x,base+.27,z,.23,.4,trim,.07,16);
    beam([x,base,z],[x,base+.64,z],.115,steel,16);
    for(const dx of [-1.8,1.8])beam([x,base+.48,z],[x+dx,arch(x+dx)-.9,z],.092,steel,14);
  }
  // Low end bears on the older left guardhouse, as seen in video 003–004.
  for(const z of [-1.55,1.55])for(const x of [10.1,13.3])
    beam([x,3.96,z],[x,arch(x)-.89,z],.085,steel,14);

  part('Guardhouse_stone_base');
  const cx=12.0,cz=-.2,W=5.6,D=6.6;
  box(cx,.42,cz,W,.84,D,mortar);
  // Staggered individual rough-faced base blocks and recessed mortar joints.
  for(const z of [cz-D/2-.012,cz+D/2+.012])for(let row=0;row<3;row++){
    const shift=row%2?.43:0;
    for(let x=cx-W/2-.9+shift;x<cx+W/2;x+=.9){const left=Math.max(x,cx-W/2),right=Math.min(x+.872,cx+W/2);if(right>left)box((left+right)/2,.145+row*.276,z,right-left,.251,.095,stone);}
  }
  for(const x of [cx-W/2-.012,cx+W/2+.012])for(let row=0;row<3;row++){
    const shift=row%2?.43:0;
    for(let z=cz-D/2-.9+shift;z<cz+D/2;z+=.9){const front=Math.max(z,cz-D/2),back=Math.min(z+.872,cz+D/2);if(back>front)box(x,.145+row*.276,(front+back)/2,.095,.251,back-front,stone);}
  }
  box(cx,.882,cz,W+.12,.12,D+.12,trim);
  part('Guardhouse_wall_and_recessed_glazing');
  // Shell with actual front/side openings, a visible interior and masonry piers.
  box(cx,1.15,cz,W,.48,D,tile);box(cx,3.34,cz,W,.76,D,tile);
  box(cx,1.18,cz,W-.32,.03,D-.32,shadow);
  for(const x of [cx-W/2+.18,cx+W/2-.18])for(const z of [cz-D/2+.18,cz+D/2-.18])box(x,2.17,z,.36,1.68,.36,tile);
  box(cx+2.08,2.17,cz-D/2+.15,1.08,1.68,.3,tile);
  // Front window, deep sill, two panes and narrow weathered aluminium frames.
  function glazedWindow(x,y,z,width,height,angle=0){
    const c=Math.cos(angle),s=Math.sin(angle),point=(a,b)=>[x+a*c+b*s,z-a*s+b*c];
    const pane=point(0,0);add(new T.BoxGeometry(width,height,.035),glass,[pane[0],y,pane[1]],[0,angle,0]);
    for(const a of[-width/2,0,width/2]){const p=point(a,.035);add(new T.BoxGeometry(.055,height+.09,.11),frame,[p[0],y,p[1]],[0,angle,0]);}
    for(const yy of[-height/2,height/2]){const p=point(0,.035);add(new T.BoxGeometry(width+.1,.07,.11),frame,[p[0],y+yy,p[1]],[0,angle,0]);}
    const sill=point(0,.11);add(new T.BoxGeometry(width+.24,.11,.31),trim,[sill[0],y-height/2-.10,sill[1]],[0,angle,0]);
    const gasket=point(0,-.021);add(new T.BoxGeometry(width+.065,height+.055,.025),rubber,[gasket[0],y,gasket[1]],[0,angle,0]);
  }
  // Gaskets precede visible panes in depth: slight offsets avoid z-fighting.
  glazedWindow(cx,2.17,cz+D/2-.12,4.7,1.68);
  glazedWindow(cx-W/2+.12,2.17,cz-.2,4.5,1.68,-Math.PI/2);
  glazedWindow(cx-.34,2.17,cz-D/2+.12,4.04,1.68,Math.PI);
  glazedWindow(cx+W/2-.12,2.17,cz-.2,4.5,1.68,Math.PI/2);
  // Recessed side entry on the campus side, with aluminium door and handle.
  box(cx-1.67,1.3,cz+D/2+.015,.83,2.53,.11,glass);
  for(const x of [cx-2.09,cx-1.25])box(x,1.31,cz+D/2+.09,.045,2.55,.07,frame);
  box(cx-1.67,2.60,cz+D/2+.09,.9,.05,.08,frame);box(cx-1.67,.13,cz+D/2+.09,.9,.045,.08,frame);
  beam([cx-1.37,1.00,cz+D/2+.16],[cx-1.37,1.32,cz+D/2+.16],.015,chrome,8);
  // Tile joints are shallow, with scale comparable to the 2016 doorway.
  for(let x=cx-W/2+.35;x<cx+W/2;x+=.45){box(x,1.08,cz+D/2+.012,.008,.25,.009,mortar);box(x,3.43,cz+D/2+.012,.008,.55,.009,mortar);}
  for(const y of [.98,1.22,3.13,3.43,3.68])box(cx,y,cz+D/2+.013,W-.08,.008,.009,mortar);
  part('Guardhouse_roof_and_porch');
  box(cx,3.76,cz,W+.55,.23,D+.55,trim);box(cx,3.91,cz,W+.65,.075,D+.65,stone);
  box(cx,3.99,cz-D/2-.08,W+.5,.14,.13,trim);
  const porchZ=4.56;
  box(cx,.12,porchZ,W+.15,.16,2.92,paving);box(cx,3.42,porchZ,W+.36,.21,3.0,trim);
  for(const x of [cx-W/2+.1,cx+W/2-.1])box(x,1.67,porchZ+1.26,.3,3.2,.3,tile);
  // The tall hexagonal aperture is an actual hole in the porch end wall.
  const wallShape=new T.Shape();wallShape.moveTo(-1.27,0);wallShape.lineTo(1.27,0);wallShape.lineTo(1.27,3.2);wallShape.lineTo(-1.27,3.2);wallShape.closePath();
  const hole=new T.Path();hole.moveTo(-.27,.57);hole.lineTo(-.51,1.48);hole.lineTo(-.27,2.58);hole.lineTo(.27,2.58);hole.lineTo(.51,1.48);hole.lineTo(.27,.57);hole.closePath();wallShape.holes.push(hole);
  const wallGeo=new T.ExtrudeGeometry(wallShape,{depth:.26,steps:1,bevelEnabled:false,curveSegments:1});
  add(wallGeo,tile,[cx+W/2-.1,.16,porchZ],[0,Math.PI/2,0]);
  const hex=[[-.27,.57],[-.51,1.48],[-.27,2.58],[.27,2.58],[.51,1.48],[.27,.57],[-.27,.57]];
  for(let i=0;i<6;i++)beam([cx+W/2+.18,.16+hex[i][1],porchZ-hex[i][0]],[cx+W/2+.18,.16+hex[i+1][1],porchZ-hex[i+1][0]],.04,trim,8);
  // Roof drain, small security camera and its curved service conduit.
  tube([[cx-2.45,3.75,cz+3.5],[cx-2.6,3.48,cz+3.51],[cx-2.61,2.96,cz+3.51],[cx-2.62,.16,cz+3.51]],.034,frame,26,8);
  beam([cx-2.60,3.30,cz+3.54],[cx-2.84,3.18,cz+3.76],.023,frame,8);
  add(new T.BoxGeometry(.13,.10,.29),trim,[cx-2.88,3.18,cz+3.84],[.25,-.2,0]);
  cyl(cx-2.88,3.155,cz+3.988,.039,.014,shadow,.039,16,[Math.PI/2,0,0]);
  tube([[cx-2.60,3.30,cz+3.51],[cx-2.57,3.50,cz+3.51],[cx-2.38,3.58,cz+3.51]],.007,rubber,16,5);
  part('Guardhouse_address_plate');
  // Street approach sees the guardhouse on the left. The blue plate is on its
  // street-facing (-Z) masonry corner, rather than the campus-facing porch.
  const plateX=cx+2.08,plateZ=cz-D/2-.021;
  box(plateX,2.90,plateZ,.55,.365,.024,blue);
  if(address){
    const plane=new T.PlaneGeometry(.55,.365),uv=plane.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));
    add(plane,address,[plateX,2.90,plateZ-.018],[0,Math.PI,0]);
  }else for(const dx of[-.105,.105]){
    const x=plateX-dx,z=plateZ-.017;
    box(x-.047,2.88,z,.027,.19,.007,paint);box(x+.006,2.875,z,.13,.025,.007,paint);
    flatBeam([x+.066,2.881,z],[x-.034,2.99,z],.024,.008,paint);
  }

  // Entrance name wall, clearly shown on the right of the 2022 street view.
  // User confirms the gate is unchanged since the requested period.
  part('Gate_name_wall_2022_video');
  const schoolName=material('historic_gate_gold_school_name','#ffffff',.68,0,'school-name-gold');schoolName.alphaTest=.45;schoolName.userData.explicitUV=true;
  const fascia=material('gate_pavilion_dark_fascia','#494044',.78);
  const brass=material('gate_pavilion_brass_frames','#ad9157',.3,.72);
  // Right-hand pavilion: glazed booth next to the solid lettered wall.
  box(-9.25,.13,-.2,12.5,.26,5.8,stone);
  box(-11.7,1.85,-.2,7.4,3.5,5.45,tile);
  box(-5.57,.24,-.2,4.8,.24,5.45,trim);
  box(-5.57,3.49,-.2,4.8,.29,5.45,tile);
  // Dark interior set behind the glazing rather than painted on the facade.
  box(-5.6,1.79,2.36,4.7,3.08,.18,shadow);
  box(-3.2,1.79,-.2,.2,3.08,5.35,tile);
  box(-5.6,.66,-2.85,4.7,.86,.3,mortar);
  for(let row=0;row<3;row++)for(let col=0;col<6;col++){
    const left=Math.max(-7.88,-8.25+col*.86+(row%2)*.43),right=Math.min(-3.32,left+.82);
    if(right>left)box((left+right)/2,.37+row*.28,-3.03,right-left,.25,.16,stone);
  }
  box(-5.6,2.19,-2.92,4.5,2.13,.045,glass);
  for(const x of [-7.88,-3.32])cyl(x,1.9,-3.02,.12,3.04,brass,.12,20);
  box(-5.6,2.19,-2.966,.055,2.16,.11,brass);
  for(const y of [1.08,1.2,3.3])box(-5.6,y,-2.99,4.7,.09,.22,brass);
  box(-9.25,3.69,-.2,13.05,.36,6.04,fascia);
  box(-9.25,3.91,-.2,13.2,.08,6.18,trim);
  box(-11.7,1.77,-2.97,6.95,2.96,.11,trim);
  const sign=new T.PlaneGeometry(6.25,2.14),suv=sign.attributes.uv;for(let i=0;i<suv.count;i++)suv.setY(i,1-suv.getY(i));add(sign,schoolName,[-11.7,1.95,-3.044],[0,Math.PI,0]);
  part('Retractable_gate_stainless_lattice');
  const extension=Math.max(0,Math.min(1,gateExtension));
  const length=3.9+19.1*extension,panels=22,pitch=length/panels,endX=9.0,startX=endX-length;
  for(let i=0;i<=panels;i++){
    const x=startX+i*pitch;
    tube([[x,.18,-.30],[x,1.72,-.30],[x,1.88,-.19],[x,1.93,0],[x,1.88,.19],[x,1.72,.30],[x,.18,.30]],.026,chrome,18,8);
    box(x,1.86,0,.095,.065,.29,frame);
    if(i%2===0)for(const z of[-.31,.31]){cyl(x,.112,z,.095,.055,rubber,.095,16,[Math.PI/2,0,0]);cyl(x,.112,z+(z<0?-.031:.031),.027,.01,chrome,.027,12,[Math.PI/2,0,0]);}
    if(i<panels)for(const z of[-.315,.315]){
      flatBeam([x,.39,z],[x+pitch,1.42,z],.027,.024,chrome);
      flatBeam([x,1.42,z+.014],[x+pitch,.39,z+.014],.027,.024,chrome);
      sphere(x+pitch/2,.905,z+.027,.036,frame,12);
    }
  }
  for(const z of[-.29,.29]){beam([startX,.29,z],[endX,.29,z],.018,steel,8);}
  part('Retractable_gate_motor_and_red_V');
  box(startX-.29,.985,0,.55,1.87,.77,motor);box(startX-.29,1.95,0,.58,.09,.8,chrome);
  for(const side of[-1,1]){
    const z=side*.393;
    box(startX-.29,1.25,z,.45,1.23,.016,shadow);
    for(const yy of[.55,.99,1.43]){
      flatBeam([startX-.51,yy+.14,z+side*.013],[startX-.29,yy-.09,z+side*.013],.10,.017,red);
      flatBeam([startX-.29,yy-.09,z+side*.013],[startX-.07,yy+.14,z+side*.013],.10,.017,red);
    }
  }
  box(startX-.29,1.973,.06,.18,.025,.13,amber);
  for(const x of[startX-.45,startX-.13])for(const z of[-.29,.29])cyl(x,.095,z,.091,.064,rubber,.091,16,[Math.PI/2,0,0]);
  return w.finish();
}

export function buildSculpture(api, { includePaving = true } = {}) {
  const w=workshop(api,'Silver_ribbons_and_gold_sphere_2007_2015');
  const {T,root,material,add,box,cyl,sphere,tube,custom,part}=w;
  const silver=material('historic_sculpture_brushed_stainless','#d2d8d2',.24,.96);
  const gold=material('historic_sculpture_gold_sphere','#bd983c',.2,.88);
  const granite=material('historic_sculpture_red_brown_granite','#7e493e',.7,0,'stone');
  const polished=material('historic_sculpture_polished_granite_cap','#855247',.43,.05);
  const joint=material('historic_sculpture_granite_joints','#503b34',.88);
  const concrete=material('historic_sculpture_stone_footing','#b3b3a2',.9,0,'stone');
  root.userData={historicalTarget:'Silver ribbon sculpture documented 2007 and 2015',units:'metres, estimated',origin:'plinth ground centre; +Z principal face photographed from gate',estimatedDimensions:{overallHeight:10.5,metalWidth:3.7,plinthBottom:[3.65,2.65],plinthHeight:1.9},evidence:['20130427101954931.jpg','20150527133765206520.jpg','20130426165458150.jpg'],accuracy:'Three-dimensional interpretation of photographed double-curved metal ribbons; back-face twist and absolute scale estimated',inscription:'Gold inscription is visible but not reliably readable; omitted rather than invented',exclusions:['Celebration banners','Temporary floral lettering']};
  if(includePaving){part('Sculpture_ground_footing');box(0,.045,0,5.6,.09,4.4,concrete);box(0,.11,0,4.25,.12,3.25,granite);}
  part('Sculpture_tapered_red_granite_pedestal');
  // Tapered, chamfered stone plinth with a narrow polished upper coping.
  function chamferedRing(width,depth,chamfer,y){return[[-width/2+chamfer,y,-depth/2],[width/2-chamfer,y,-depth/2],[width/2,y,-depth/2+chamfer],[width/2,y,depth/2-chamfer],[width/2-chamfer,y,depth/2],[-width/2+chamfer,y,depth/2],[-width/2,y,depth/2-chamfer],[-width/2,y,-depth/2+chamfer]];}
  const bottom=chamferedRing(3.65,2.65,.10,.17),top=chamferedRing(2.98,2.14,.085,1.84);
  const positions=[...bottom.flat(),...top.flat()],indices=[];
  for(let i=0;i<8;i++){const j=(i+1)%8;indices.push(i,8+i,j,j,8+i,8+j);}
  for(let i=1;i<7;i++)indices.push(8,8+i+1,8+i);
  const plinth=custom(positions,indices);plinth.deleteAttribute('normal');const flat=plinth.toNonIndexed();flat.computeVertexNormals();plinth.dispose();add(flat,granite);
  box(0,1.885,0,3.03,.09,2.19,polished);box(0,.19,0,3.70,.035,2.70,polished);
  // Fine dressed-stone corner and face joints, without invented lettering.
  for(const side of[-1,1])tube([[side*1.775,.24,1.277],[side*1.477,1.78,1.062]],.006,joint,4,5);
  box(0,1.10,1.155,2.0,.005,.007,joint);

  part('Sculpture_continuous_twisted_silver_ribbons');
  // Solid, smoothly lofted strips. Rounded rectangular cross-sections produce
  // broad subtly crowned faces and slim rolled edges instead of chunky tubes.
  function strip(points,widths,twists,thickness=.075,samples=130){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),false,'centripetal');
    const cross=[[-1,0],[-.988,.55],[-.95,1],[-.50,1],[0,1],[.50,1],[.95,1],[.988,.55],[1,0],[.988,-.55],[.95,-1],[.5,-1],[0,-1],[-.5,-1],[-.95,-1],[-.988,-.55],[-1,0]];
    const p=[],uv=[],idx=[],rows=cross.length;
    const interpolate=(values,t)=>{const f=t*(values.length-1),i=Math.min(values.length-2,Math.floor(f)),k=f-i;return values[i]+(values[i+1]-values[i])*(k*k*(3-2*k));};
    for(let i=0;i<=samples;i++){
      const t=i/samples,point=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
      let widthDirection=new T.Vector3(-tangent.y,tangent.x,0).normalize();
      if(widthDirection.lengthSq()<.01)widthDirection=new T.Vector3(1,0,0);
      widthDirection.applyAxisAngle(tangent,interpolate(twists,t));
      const faceDirection=new T.Vector3().crossVectors(tangent,widthDirection).normalize();
      const width=interpolate(widths,t),edgeThickness=Math.min(thickness,width*.65);
      for(let j=0;j<rows;j++){
        const[u,v]=cross[j],crown=.034*(1-u*u)*Math.sign(v)*Math.min(1,width/.25),q=point.clone().addScaledVector(widthDirection,u*width/2).addScaledVector(faceDirection,v*edgeThickness/2+crown);
        p.push(q.x,q.y,q.z);uv.push(j/(rows-1),t*6);
      }
    }
    for(let i=0;i<samples;i++)for(let j=0;j<rows-1;j++){const k=i*rows+j;idx.push(k,k+rows,k+1,k+1,k+rows,k+rows+1);}
    for(let j=1;j<rows-2;j++){idx.push(0,j+1,j);const k=samples*rows;idx.push(k,k+j,k+j+1);}
    add(custom(p,idx,uv),silver);
  }
  // Broad lower crescent: grows out of the stone, curls right, ends in a blade.
  strip([[-.48,1.94,.05],[.33,2.43,.04],[1.02,3.32,.07],[.90,4.32,.02],[.30,5.08,-.04],[-.68,5.45,-.07],[-1.69,5.35,-.06]],
    [.13,.65,1.01,1.14,1.25,.87,.014],[.04,-.13,.04,.25,.35,.12,-.12],.085,150);
  // Rising counter-ribbon, visible behind the lower crescent and through gaps.
  strip([[.13,1.99,-.31],[.85,3.24,-.37],[1.09,4.78,-.35],[.49,5.79,-.34],[-.53,6.50,-.20],[-1.13,6.25,-.05]],
    [.11,.32,.57,.61,.58,.014],[-.25,.08,.27,-.06,-.39,.18],.063,125);
  // Upper airborne loop inclines forward and returns across the main upright.
  strip([[-1.49,5.64,.10],[-.65,6.33,.20],[.43,7.44,.10],[1.44,8.02,-.02],[1.68,7.51,-.10],[.86,6.76,-.03],[-.09,6.26,.13]],
    [.013,.25,.41,.58,.57,.26,.012],[-.35,-.18,.21,.71,.45,-.16,-.3],.060,150);
  // Tall tapered lance, offset in depth so the open eye remains open.
  strip([[-.71,5.44,-.06],[-.48,6.31,-.03],[-.29,7.31,-.01],[-.12,8.27,-.08],[-.22,9.17,-.18],[-.64,10.47,-.30]],
    [.10,.30,.36,.27,.17,.009],[.02,.23,.47,.55,.2,.02],.065,155);
  // Short leaf-like offshoot is visible immediately below the gold globe.
  strip([[-.27,7.32,.04],[-.53,7.69,.10],[-1.06,7.29,.16]],
    [.035,.32,.012],[-.1,.25,-.45],.05,64);
  part('Sculpture_gold_sphere_and_discrete_mount');
  cyl(.69,7.86,-.08,.052,.18,silver,.044,20);sphere(.69,8.20,-.08,.365,gold,48);
  return w.finish();
}

export function geometryStats(root, T) {
  let meshes=0,vertices=0,triangles=0;
  const materials=new Set();
  root.traverse(object=>{if(object.isMesh){meshes++;vertices+=object.geometry.attributes.position.count;triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;materials.add(object.material);}});
  const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());
  return {name:root.name,meshes,materials:materials.size,vertices,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},sizeMetres:size.toArray()};
}
