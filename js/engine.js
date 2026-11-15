/* Motor físico: Darcy-Weisbach, Colebrook-White, pérdidas y dimensionamiento */
/* ---- Motor físico ---- */
function geom(r){
 if(r.forma==="R"){const a=num(r.h)/1000,b=num(r.w)/1000;if(a<=0||b<=0)return null;return{A:a*b,Dh:2*a*b/(a+b)}}
 if(r.forma==="O"){const a=num(r.h)/1000,b=num(r.w)/1000;if(a<=0||b<=0)return null;const A=Math.PI*a*b/4,P=Math.PI*Math.sqrt((a*a+b*b)/2);return{A,Dh:4*A/P}}
 const d=num(r.d)/1000;if(d<=0)return null;return{A:Math.PI*d*d/4,Dh:d};
}
function colebrook(eps,Dh,Re){ // Colebrook-White iterativo
 if(Re<=0)return 0; if(Re<2300)return 64/Re;
 let x=0.25/Math.pow(Math.log10(eps/(3.7*Dh)+5.74/Math.pow(Re,0.9)),2); // semilla
 for(let i=0;i<50;i++){const n=1/Math.sqrt(x);const m=-2*Math.log10(eps/(3.7*Dh)+2.51*n/Re);const y=1/(m*m);if(Math.abs(y-x)<1e-10){x=y;break}x=y}
 return x;
}
function calc(r){
 const g=geom(r),o={id:r.n1+"."+(r.n2===""?0:r.n2)+(r.n3===""?"":"."+r.n3),padre:r.n2===""?"VENTILADOR":(r.n3===""?r.n1+".0":r.n1+"."+r.n2)};
 if(!g||num(r.q)<=0)return o;
 const D=S.d,V=num(r.q)/g.A,Re=V*g.Dh/D.nu,eps=(MS[r.mat]||0.15)/1000,K=KS[r.acc]??0,pd=D.rho*V*V/2;
 Object.assign(o,{A:g.A,Dh:g.Dh,V,Re,K});
 if(r.acc==="Conducto"){o.f=colebrook(eps,g.Dh,Re);o.dp=o.f*(num(r.len)/1000/g.Dh)*pd}else o.dp=K*pd;
 const base=(r.acc==="Conducto"?-20:/codo|derivación/i.test(r.acc)?-10:/rejilla|difusor/i.test(r.acc)?0:-15);
 o.dB=base+10*Math.log10(g.A)+50*Math.log10(V)+55;
 return o;
}
function calcAll(){
 const res=S.rows.map(calc),by={};res.forEach(x=>{if(!(x.id in by))by[x.id]=x});
 const tot=x=>{if(x._t!=null)return x._t;if(x.dp==null){return 0}x._t=x.dp+(x.padre==="VENTILADOR"||!by[x.padre]?0:tot(by[x.padre]));return x._t};
 res.forEach(x=>{if(x.dp!=null)x.tot=tot(x)});
 return res;
}
function dimensionar(r){ // devuelve la fila con la sección propuesta según el método elegido
 const D=S.d,q=num(r.q);if(q<=0)return r;const obj=num(D.obj[D.metodo]);let Dc;
 if(D.metodo==="friccion"){let lo=0.02,hi=3;for(let i=0;i<60;i++){const m=(lo+hi)/2,A=Math.PI*m*m/4,V=q/A,Re=V*m/D.nu,ff=colebrook((MS[r.mat]||0.15)/1000,m,Re);(ff/m*D.rho*V*V/2>obj)?lo=m:hi=m}Dc=(lo+hi)/2}
 else Dc=Math.sqrt(4*q/(Math.PI*obj));
 const A=Math.PI*Dc*Dc/4,n={...r};
 if(r.forma==="C")n.d=Math.round(Dc*1000);
 else{const h=num(r.h)||300;n.h=h;n.w=Math.round(r.forma==="R"?A*1e6/h:4*A*1e6/(Math.PI*h))}
 return n;
}

