/* Interfaz, vistas, proyectos (localStorage) y eventos */
/* ---- Vistas ---- */
function fld(k,l,t="text",extra=""){return `<label>${l}<input data-d="${k}" type="${t}" ${extra} value="${esc(S.d[k])}"></label>`}
function vDatos(){
 return `<div class="card"><h2>Datos de diseño</h2><h3>Proyecto</h3><div class="grid">${fld("nombre","Nombre")}${fld("codigo","Código")}${fld("cliente","Cliente")}${fld("ing","Ingeniero")}${fld("fecha","Fecha","date")}
 <label>Tipo de buque<select data-d="tipo">${SHIPS.map(s=>`<option ${s===S.d.tipo?"selected":""}>${s}</option>`).join("")}</select></label></div>
 <h3>Condiciones de diseño</h3><div class="grid">${fld("tint","Temperatura interior (°C)","number")}${fld("text","Temperatura exterior (°C)","number")}${fld("rho","Densidad aire (kg/m³)","number",'step="0.01"')}${fld("nu","Viscosidad cinemática (m²/s)","number",'step="1e-7"')}</div>
 <h3>Heredado de otros buques</h3><div class="grid">${fld("buque","Buque de partida")}${fld("similar","Buque similar")}</div>
 <h3>Método de dimensionamiento</h3><div class="grid"><label>Método<select data-d="metodo">${Object.entries(METHODS).map(([k,v])=>`<option value="${k}" ${k===S.d.metodo?"selected":""}>${v[0]}</option>`).join("")}</select></label>
 ${Object.entries(METHODS).map(([k,v])=>`<label>Objetivo ${v[0]} (${v[2]})<input data-obj="${k}" type="number" step="0.1" value="${S.d.obj[k]}"></label>`).join("")}</div>
 <p class="note">Objetivos por defecto provisionales: ajústalos a tu criterio de proyecto.</p></div>`;
}
function vDuct(){
 const R=calcAll(),mx=Math.max(0,...R.map(x=>x.tot||0));
 const sel=(i,k,opts)=>`<select data-i="${i}" data-k="${k}">${opts.map(o=>`<option ${o===S.rows[i][k]?"selected":""}>${o}</option>`).join("")}</select>`;
 const inp=(i,k,w)=>`<input data-i="${i}" data-k="${k}" type="number" step="any" value="${esc(S.rows[i][k])}" ${w?`style="width:${w}px"`:""}>`;
 const body=S.rows.map((r,i)=>{const c=R[i];return `<tr><td>${i+1}</td><td>${inp(i,"n1",45)}</td><td>${inp(i,"n2",45)}</td><td>${inp(i,"n3",45)}</td><td>${c.id}</td><td>${c.padre}</td>
 <td><select data-i="${i}" data-k="forma"><option value="C" ${r.forma==="C"?"selected":""}>Circular</option><option value="R" ${r.forma==="R"?"selected":""}>Rectangular</option><option value="O" ${r.forma==="O"?"selected":""}>Oval</option></select></td>
 <td class="l">${sel(i,"acc",Object.keys(KS))}</td><td>${f(c.K,2)}</td><td>${inp(i,"q")}</td><td>${inp(i,"h")}</td><td>${inp(i,"w")}</td><td>${inp(i,"d")}</td><td>${inp(i,"len")}</td><td class="l">${sel(i,"mat",Object.keys(MS))}</td>
 <td>${f(c.A,4)}</td><td>${f(c.Dh*1000,0)}</td><td>${f(c.V)}</td><td>${f(c.Re,0)}</td><td>${f(c.f,4)}</td><td>${f(c.dp,1)}</td><td class="${c.tot!=null&&c.tot===mx&&mx>0?"o":""}">${f(c.tot,1)}</td>
 <td class="${c.dB==null?"":c.dB<50?"g":"r"}">${f(c.dB,1)}</td><td><button class="btn sec" data-fit="${i}" title="Dimensionar esta línea">Dimensionar</button> <button class="btn sec" data-ins="${i}" title="Insertar línea debajo">+</button> <button class="btn sec" data-del="${i}" title="Eliminar línea">×</button></td></tr>`}).join("");
 return `<div class="card"><h2>Dimensionamiento de conductos</h2><div class="bar"><button class="btn" data-add>Añadir línea</button><button class="btn sec" data-fitall>Dimensionar todo (${METHODS[S.d.metodo][0]})</button></div>
 <div class="wrap"><table><thead><tr><th>#</th><th>N1</th><th>N2</th><th>N3</th><th>ID tramo</th><th>ID padre</th><th>Forma</th><th class="l">Elemento</th><th>K</th><th>Q m³/s</th><th>Alto mm</th><th>Ancho mm</th><th>Ø mm</th><th>Long. mm</th><th class="l">Material</th><th>A m²</th><th>Dh mm</th><th>V m/s</th><th>Re</th><th>f</th><th>ΔP Pa</th><th>ΔP total Pa</th><th>Ruido dB</th><th></th></tr></thead><tbody>${body}</tbody></table></div>
 <p class="note">Rugosidad según material y f por Colebrook-White iterativo. Fila “Conducto”: ΔP = f·(L/Dh)·ρV²/2; resto de elementos: ΔP = K·ρV²/2. Naranja = mayor pérdida acumulada. Ruido: verde &lt; 50 dB, rojo ≥ 50 dB. Para oval, Dh = 4A/P (elipse).</p></div>`;
}
function vRep(){
 const R=calcAll();
 return `<div class="card"><h2>Resumen de conductos</h2><div class="bar"><button class="btn" onclick="window.print()">Imprimir / guardar PDF</button><button class="btn sec" id="cpy">Copiar tabla para Excel</button></div>
 <p><b>${esc(S.d.nombre||"Sin nombre")}</b> · ${esc(S.d.codigo)} · ${esc(S.d.cliente)} · ${esc(S.d.tipo)} · ${esc(S.d.ing)} · ${esc(S.d.fecha)}</p>
 <div class="wrap"><table><thead><tr><th>ID tramo</th><th class="l">Elemento</th><th>Forma</th><th>Q m³/s</th><th>V m/s</th><th>Dh mm</th><th>ΔP Pa</th><th>ΔP total Pa</th><th>Ruido dB</th></tr></thead><tbody>
 ${S.rows.map((r,i)=>{const c=R[i];return `<tr><td>${c.id}</td><td class="l">${esc(r.acc)}</td><td>${r.forma}</td><td>${f(r.q,3)}</td><td>${f(c.V)}</td><td>${f(c.Dh*1000,0)}</td><td>${f(c.dp,1)}</td><td>${f(c.tot,1)}</td><td>${f(c.dB,1)}</td></tr>`}).join("")}</tbody></table></div></div>`;
}
const DB="hvac:projects";
function loadDB(){try{return JSON.parse(localStorage.getItem(DB)||"{}")}catch(e){return{}}}
function saveDB(o){try{localStorage.setItem(DB,JSON.stringify(o));return true}catch(e){alert("No se pudo guardar en este navegador.");return false}}
function vProy(){
 const db=loadDB(),ks=Object.keys(db);
 return `<div class="card"><h2>Proyectos guardados</h2><div class="bar"><button class="btn" id="save">Guardar proyecto actual</button></div>
 ${ks.length?`<div class="wrap"><table><thead><tr><th class="l">Proyecto</th><th>Líneas</th><th></th></tr></thead><tbody>${ks.map(k=>`<tr><td class="l">${esc(k)}</td><td>${db[k].rows.length}</td><td><button class="btn sec" data-load="${esc(k)}">Abrir</button> <button class="btn sec" data-copy="${esc(k)}">Copiar a nuevo</button> <button class="btn sec" data-rm="${esc(k)}">Eliminar</button></td></tr>`).join("")}</tbody></table></div>`:`<p class="note">Aún no hay proyectos. Rellena los datos y pulsa “Guardar proyecto actual”.</p>`}
 <p class="note">Los proyectos se guardan en este navegador. La capa de datos (loadDB/saveDB) está aislada para sustituirla por Firebase al desplegar fuera de esta vista.</p></div>`;
}
function summary(){
 const R=calcAll(),tot=R.map(x=>x.tot||0),Vm=Math.max(0,...R.map(x=>x.V||0)),Q=num(S.rows[0]?.q);
 $("#sum").innerHTML=[["Proyecto",S.d.nombre||"—"],["Tipo",S.d.tipo],["T int / ext",S.d.tint+" / "+S.d.text+" °C"],["Método",METHODS[S.d.metodo][0]],["Líneas",S.rows.length],["V máx.",f(Vm)+" m/s"],["ΔP máx. acumulada",f(Math.max(0,...tot),1)+" Pa"],["Líneas > 50 dB",R.filter(x=>x.dB>=50).length]].map(([a,b])=>`<div class="row"><span>${a}</span><b>${esc(b)}</b></div>`).join("");
}
function render(){
 $("#nav").innerHTML=TABS.map(([k,l])=>`<button class="${k===tab?"on":""}" data-tab="${k}">${l}</button>`).join("");
 $("#view").innerHTML={datos:vDatos,duct:vDuct,rep:vRep,proy:vProy}[tab]();summary();
}
/* ---- Eventos ---- */
document.addEventListener("click",e=>{
 const t=e.target.closest("button");if(!t)return;const d=t.dataset;
 if(d.tab){tab=d.tab;render()}
 else if(t.hasAttribute("data-add")){S.rows.push({...blank(),n1:S.rows.length?S.rows[S.rows.length-1].n1:1});render()}
 else if(d.ins!=null){S.rows.splice(+d.ins+1,0,{...S.rows[+d.ins]});render()}
 else if(d.del!=null){if(S.rows.length>1)S.rows.splice(+d.del,1);render()}
 else if(d.fit!=null){S.rows[+d.fit]=dimensionar(S.rows[+d.fit]);render()}
 else if(t.hasAttribute("data-fitall")){S.rows=S.rows.map(dimensionar);render()}
 else if(t.id==="cpy"){const R=calcAll();const tsv=["ID\tElemento\tForma\tQ\tV\tDh\tdP\tdP total\tdB"].concat(S.rows.map((r,i)=>{const c=R[i];return [c.id,r.acc,r.forma,r.q,f(c.V),f(c.Dh*1000,0),f(c.dp,1),f(c.tot,1),f(c.dB,1)].join("\t")})).join("\n");
  (navigator.clipboard?navigator.clipboard.writeText(tsv):Promise.reject()).then(()=>alert("Tabla copiada. Pégala en Excel."),()=>alert("El navegador bloqueó el portapapeles."))}
 else if(t.id==="save"){const n=S.d.nombre||S.d.codigo;if(!n){alert("Indica un nombre o código de proyecto en Datos de diseño.");return}const db=loadDB();db[n]=JSON.parse(JSON.stringify(S));saveDB(db);render()}
 else if(d.load){const db=loadDB();S=JSON.parse(JSON.stringify(db[d.load]));tab="datos";render()}
 else if(d.copy){const db=loadDB(),n=prompt("Nombre del nuevo proyecto:",d.copy+" (copia)");if(n){const c=JSON.parse(JSON.stringify(db[d.copy]));c.d.nombre=n;db[n]=c;saveDB(db);render()}}
 else if(d.rm){if(confirm("¿Eliminar “"+d.rm+"”?")){const db=loadDB();delete db[d.rm];saveDB(db);render()}}
});
document.addEventListener("change",e=>{
 const t=e.target,d=t.dataset;
 if(d.d){S.d[d.d]=t.type==="number"?num(t.value):t.value;render()}
 else if(d.obj){S.d.obj[d.obj]=num(t.value);render()}
 else if(d.i!=null){S.rows[+d.i][d.k]=t.value;render()}
});
/* Tema de color */
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem("hvac:theme",t)}catch(e){}}
(function(){const sel=$("#theme");sel.value=document.documentElement.dataset.theme||"claro";if(!sel.value)sel.value="claro";sel.addEventListener("change",()=>setTheme(sel.value))})();
render();
