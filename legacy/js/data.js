/* Datos base, estado y utilidades */
const TABS=[["proy","1 · Proyectos"],["datos","2 · Datos de diseño"],["duct","3 · Conductos"],["rep","4 · Reportes"]];
const SV=p=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONS={
 proy:SV('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
 datos:SV('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h.01"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
 duct:SV('<path d="M3 5h12a5 5 0 0 1 5 5v11"/><path d="M3 9h12a1 1 0 0 1 1 1v11"/><path d="M3 5v4"/>'),
 rep:SV('<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 17v-3M12 17v-6M15 17v-4"/>')
};
const ACC="Conducto:0;Codo 15:0.1;Codo 30:0.2;Codo 45:0.3;Codo 60:0.35;Codo 90 radio corto:0.5;Codo 90 radio largo:0.3;Codo 180 (U):1.5;Doble codo:1.2;Te derivación abrupta:1.2;Te derivación balanceada:0.8;Transición R-C:0.58;Transición R-C suave:0.4;Reducción gradual 10-20%:0.3;Reducción abrupta:0.6;Expansión gradual:0.3;Plenum rectangular:0.5;Plenum circular:0.5;Rejilla:1.2;Difusor techo:1.5;Difusor pared:1.2;Difusor lineal:1.2;Terminal techo:1.5;Filtro de aire (plegado):3;Filtro HEPA alta eficiencia:8;Silenciador:0.4;Silenciador naval:3;Fire damper abierto:2;Smoke damper:4;Válvula de mariposa abierta:0.5;Iris damper:5;Conector flexible:0.3;Paso por cubierta:2;Pasamuros estancos:2;Difusor estanco NBQ:5;Apaga llamas/Flame arrestor:15;Brida de unión:0.1";
const MAT="Aluminio:0.05;Acero comercial:0.045;Acero galvanizado:0.15;Acero inoxidable:0.05;Chapa negra:0.1;Climaver Neto:0.05;Conducto flexible:3;Fibra de vidrio:0.9;PRFV:0.01;PVC:0.0015;Espirometálico (acero):0.15";
const parse=s=>Object.fromEntries(s.split(";").map(x=>{const i=x.lastIndexOf(":");return[x.slice(0,i),+x.slice(i+1)]}));
const KS=parse(ACC),MS=parse(MAT);
const METHODS={friccion:["Fricción igual",1,"Pa/m"],reducida:["Velocidad reducida",6,"m/s"],estatica:["Recuperación estática",5,"m/s"],naval:["Naval",10,"m/s"]};
const SHIPS=["Buque militar","Plataforma","Yate","Buque hidrográfico"];
const blank=()=>({n1:1,n2:"",n3:"",forma:"C",acc:"Conducto",q:0.5,h:"",w:"",d:300,len:1000,mat:"Acero galvanizado"});
let S={d:{nombre:"",codigo:"",cliente:"",ing:"",fecha:new Date().toISOString().slice(0,10),tipo:SHIPS[0],buque:"",similar:"",tint:24,text:35,rho:1.2,nu:0.0000151,metodo:"reducida",obj:{friccion:1,reducida:6,estatica:5,naval:10}},rows:[blank()]};
let tab="proy";
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=v=>v===""||v==null?0:+v;
const f=(v,n=2)=>v===""||v==null||!isFinite(v)?"":(+v).toFixed(n);

