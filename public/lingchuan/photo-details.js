// Geometry traced from the user's 2017 photographs. Dimensions remain estimates.
// These builders use the same batched geometry API as campus.js.
export function planetarium(a) {
 const {T,box,cyl,add,beam,label,mat,window,white,cream,roof,stone,frame,glass,glassDark,red,paving}=a;
 const tile=mat('planetarium_small_pink_tile','#cab6ad',.85,'tile');tile.userData.tileScale=.9;
 const blue=mat('planetarium_bowed_blue_tile','#98b4c0',.86,'tile');blue.userData.tileScale=.9;
 const base=2.15,front=8.05;
 // Continuous raised terrace, retaining wall and two side stairs.
 box(0,1.05,9.5,20,2.1,6.5,stone);box(0,2.15,9.5,20.3,.18,6.8,paving);
 for(let row=0;row<5;row++)for(let x=-10+(row%2)*.8;x<10;x+=1.6){const w=Math.min(1.52,10-x);if(w>0)box(x+w/2,.24+row*.4,12.77,w,.36,.12,stone);}
 for(const side of [-1,1]){
  const x=side*8.45;
  for(let i=0;i<13;i++){const y=base*(i+1)/13;box(x,y/2,17.8-i*.39,3.05,y,.41,stone);}
  for(const edge of [-1,1]){
   const xx=x+edge*1.52;
   beam([xx,1.06,18.05],[xx,3.25,12.9],.045,frame);
   for(let i=0;i<=4;i++){const z=17.8-i*1.2,y=base*i/4;cyl(xx,y+.58,z,.044,1.15,frame);}
  }
 }
 // Ground glass doors, straight window bands above, and one bowed blue bay.
 box(0,base+6.5,-8,16,13,32,tile);box(0,base+13.16,-8,16.55,.3,32.5,cream);
 for(let f=1;f<4;f++)for(const x of [-3.25,3.25])window(x,base+1.62+f*3.16,front,5.2,1.85);
 for(let f=0;f<4;f++)for(let z=-22;z<-4;z+=3.7)for(const side of [-1,1])add(new T.BoxGeometry(.07,1.85,2),glassDark,[side*8.04,base+1.65+f*3.16,z]);
 for(const x of [-7.15,7.15]){
  box(x,base+7.1,7.1,1.7,14.2,2.4,tile);
  for(const y of [base+3.7,base+4.05,base+13.85,base+14.16])box(x,y,7.1,2.04,.18,2.7,cream);
  box(x,base+14.45,7.1,2.3,.24,3.05,cream);
 }
 for(let x=-5.4;x<5.5;x+=1.8){box(x,base+1.42,8.14,1.72,2.6,.07,glassDark);box(x-.86,base+1.42,8.21,.065,2.7,.11,frame);box(x,base+2.12,8.23,1.72,.06,.08,frame);}
 for(const x of [-6.25,6.25])box(x,base+1.4,8.19,.65,2.6,.11,red);
 box(0,base+2.93,8.29,13.3,.44,.46,frame);
 // Convex tiled surround follows a shallow cylindrical curve across the facade.
 const bow=x=>8.12+1.2*(1-(x/6.1)**2),yy=base+7.65;
 for(let j=0;j<24;j++){
  const x=-6.1+(j+.5)*12.2/24,ang=Math.atan(2.4*x/(6.1*6.1));
  add(new T.BoxGeometry(.53,3.9,.26),blue,[x,yy,bow(x)],[1,1,1],[0,ang,0]);
  add(new T.BoxGeometry(.49,2.35,.05),glass,[x,yy+.48,bow(x)+.17],[1,1,1],[0,ang,0]);
  beam([x-.25,yy-.72,bow(x)+.22],[x-.25,yy+1.66,bow(x)+.22],.019,frame);
 }
 for(const h of [yy-.7,yy+.45,yy+1.67])for(let j=0;j<24;j++){const x=-6.1+j*12.2/24,nx=x+12.2/24;beam([x,h,bow(x)+.23],[nx,h,bow(nx)+.23],.024,frame);}
 label('planetarium-label',0,yy-1.3,9.53,9.6,1.05);
 // Platform rail, with open access where each side stair meets the terrace.
 for(let x=-6.6;x<=6.7;x+=1.65){cyl(x,2.73,12.71,.045,1.15,frame);a.sphere(x,3.34,12.71,.09,frame,[1,1,1],10);}
 for(const y of [2.45,3.3])beam([-6.65,y,12.71],[6.65,y,12.71],.045,frame);
 for(let x=-6.6;x<6.7;x+=.22)cyl(x,2.85,12.71,.013,.86,frame,.013,5);
 // Two-panel roofed notice board in front of the stone retaining wall.
 for(const x of [-3.4,3.4])box(x,1.08,13.3,.16,2.16,.18,frame);
 box(0,1.46,13.3,6.9,1.44,.18,frame);
 for(const x of [-1.7,1.7])box(x,1.46,13.42,3.2,1.18,.04,cream);
 for(const side of [-1,1])add(new T.BoxGeometry(7.3,.1,.63),roof,[0,2.34,13.3+side*.27],[1,1,1],[side*.2,0,0]);
 // Dome sits on the front roof. Both latitude and meridian seams are visible.
 const domeY=base+14.05;
 cyl(0,base+13.65,1,6.15,.7,tile,6.15,48);cyl(0,domeY-.07,1,6.4,.16,cream,6.4,48);
 add(new T.SphereGeometry(6.28,48,24,0,Math.PI*2,0,Math.PI/2),roof,[0,domeY,1],[1,.88,1]);
 for(let i=0;i<24;i++){const aa=i*Math.PI/12;for(let j=0;j<14;j++){const p=j*Math.PI/28,q=(j+1)*Math.PI/28;beam([Math.cos(p)*Math.sin(aa)*6.3,domeY+.02+Math.sin(p)*5.55,1+Math.cos(p)*Math.cos(aa)*6.3],[Math.cos(q)*Math.sin(aa)*6.3,domeY+.02+Math.sin(q)*5.55,1+Math.cos(q)*Math.cos(aa)*6.3],.025,frame);}}
 for(let j=1;j<7;j++){const t=j*Math.PI/16;add(new T.TorusGeometry(Math.cos(t)*6.3,.023,4,64),frame,[0,domeY+.02+Math.sin(t)*5.55,1],[1,1,1],[Math.PI/2,0,0]);}
 cyl(0,domeY+6,1,.025,1.1,frame,.01,8);
}

export function laboratory(a) {
 const {box,window,label,add,T,white,cream,stone,roof,red,frame}=a;
 box(0,.35,0,39,.7,16,stone);box(0,9.2,0,37,17.7,15,cream);
 for(let f=0;f<5;f++)for(let x=-16.5;x<=16.6;x+=3.3)window(x,2.2+f*3.4,7.56,3.12,2.25);
 for(let x=-18.4;x<=18.5;x+=6.15)box(x,9.35,7.75,.5,18.3,.4,roof);
 box(0,18.3,0,37.7,.35,15.7,roof);box(0,18.51,7.9,38,.18,.45,red);
 for(let x=-19;x<=19;x+=.24)box(x,18.63,7.93,.12,.2,.52,red);
 for(const x of [-3.2,3.2])box(x,2.2,10.1,.35,3.7,.38,red);
 for(const side of [-1,1])add(new T.BoxGeometry(7.1,.16,1.85),red,[0,4.28,9.2+side*.8],[1,1,1],[side*.23,0,0]);
 label('laboratory-label',0,6.65,7.91,5.2,.9);
 for(let i=0;i<6;i++)box(0,.09+i*.1,13.5-i*.5,10,.18+i*.2,.54,stone);
 for(const x of [-16,-10,10,16]){box(x,.65,11,5,1.1,2.4,stone);a.shrub(x,11,1.4);}
}

export function office(a) {
 const {T,box,cyl,add,beam,window,label,cream,stone,roof,glass,frame}=a;
 box(0,.3,0,26,.6,13,stone);box(0,5.55,0,25,10.5,12,cream);box(0,10.95,0,25.6,.3,12.6,roof);
 for(let f=0;f<3;f++)for(const x of [-10,-6,3.4,7.4,10.7])window(x,2.1+f*3.2,6.08,1.8,2.05);
 cyl(-1.7,6.4,5.8,2.15,12.6,cream,2.15,32);
 add(new T.CylinderGeometry(2.19,2.19,11.7,24,1,true,-Math.PI/2,Math.PI),glass,[-1.7,6.5,5.8]);
 for(let j=0;j<=8;j++){const t=-Math.PI/2+j*Math.PI/8,x=-1.7+Math.sin(t)*2.23,z=5.8+Math.cos(t)*2.23;beam([x,.6,z],[x,12.4,z],.033,frame);}
 for(let f=1;f<10;f++)add(new T.TorusGeometry(2.24,.026,4,24,Math.PI),frame,[-1.7,.6+f*1.2,5.8],[1,1,1],[Math.PI/2,0,0]);
 label('office-label',6.7,7.72,6.19,5.7,.9);
 for(const x of [-10,-5,5,10]){box(x,.55,9,4.4,.9,2.2,stone);a.shrub(x,9,1.3);}
 for(let i=0;i<4;i++)box(0,.1+i*.1,11.2-i*.5,6,.2+i*.2,.55,stone);
}

export function library(a) {
 const {box,window,label,cream,stone,roof}=a;
 box(0,8.9,0,20,17.8,20,cream);box(0,18.08,0,20.7,.35,20.7,roof);
 for(let f=0;f<5;f++)for(const x of [-7.4,-2.5,2.5,7.4])window(x,2+f*3.4,10.06,1.8,2.2);
 box(0,3.1,12.2,12.8,.55,5.3,roof);label('library-label',0,3.65,14.91,5.8,1.05);
 for(const x of [-5.4,5.4])box(x,1.5,14.3,.3,2.9,.35,cream);
 for(let i=0;i<8;i++)box(0,.1+i*.12,19-i*.5,14,.2+i*.24,.55,stone);
}

export function pingpong(a) {
 const {T,mat,box,beam,add,paving,cream,frame,stone}=a;
 const top=mat('2017_pingpong_purple','#af698b',.8),edge=mat('2017_pingpong_blue_edges','#385c9c',.68);
 box(0,.18,0,23,.18,25,paving);
 // Eight tables represented from the visible rows; spacing is photo-derived.
 for(let row=0;row<4;row++)for(const x of [-5.1,4.7]){
  const z=-8.5+row*5.6;
  box(x,.97,z,2.74,.06,1.525,top);for(const xx of [-1.37,1.37])box(x+xx,.97,z,.04,.1,1.565,edge);
  for(const zz of [-.7625,.7625])box(x,.97,z+zz,2.74,.1,.04,edge);
  box(x,1.006,z,2.70,.008,.018,cream);
  for(const sx of [-.85,.85])for(const sz of [-1,1])beam([x+sx,.9,z],[x+sx+sz*.18,.24,z+sz*.59],.035,edge);
  beam([x-1,.56,z],[x+1,.56,z],.026,edge);
  for(const zz of [-.88,.88])beam([x,1,z+zz],[x,1.17,z+zz],.017,frame);
  for(let zz=-.88;zz<.9;zz+=.09)beam([x,1.01,z+zz],[x,1.15,z+zz],.006,frame);
  beam([x,1.16,z-.88],[x,1.16,z+.88],.009,cream);
  for(const xx of [-2.8,2.8])box(x+xx,.292,z,.07,.015,4.4,cream);
  for(const zz of [-2.2,2.2])box(x,.292,z+zz,5.6,.015,.07,cream);
 }
 // Tree wells and stone benches from IMG_3588, along the edge of the court.
 for(const z of [-9,0,9]){add(new T.TorusGeometry(1.25,.18,6,24),stone,[11,.36,z],[1,1,1],[Math.PI/2,0,0]);a.tree(11,z,10,'broad');box(8.6,.65,z,2.7,.16,.58,stone);for(const x of [7.7,9.5])box(x,.36,z,.24,.56,.4,stone);}
}
