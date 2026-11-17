import re,json
t=open('/tmp/spec.txt',encoding='utf-8').read().split('\n')
def num(s): return float(s.replace(',','.'))
acc=[];mat=[]
mode=None
for ln in t:
    s=ln.strip()
    if s.startswith('ACCESORIO ') and s.endswith(' K'): mode='acc';continue
    if s.startswith('MATERIAL ') and 'RUGOSIDAD' in s: mode='mat';continue
    if not s or s.startswith('---'):
        continue
    if mode=='acc':
        m=re.match(r'^(.*?)\s{2,}([\d,]+)$',ln.strip())
        if m: acc.append([m.group(1).strip(),num(m.group(2))])
        elif acc and not re.search(r'\d',s[-1]): mode=None
    elif mode=='mat':
        m=re.match(r'^(.*?)\s{2,}([\d,]+)\s{2,}(\d+)$',s)
        if m: mat.append([m.group(1).strip(),num(m.group(2)),int(m.group(3))])
        else: mode=None
# fix duplicate names
seen={}
out=[]
for n,k in acc:
    if n in seen:
        n=n+' (2)'
    seen[n]=1;out.append({'name':n,'k':k})
print(len(out),len(mat))
open('src/engine/defaultsData.ts','w',encoding='utf-8').write(
 '// Generado desde APLICACION_SHIPHVAC.docx (tools/gen_defaults.py)\n'
 'export const DEFAULT_ACCESSORIES: {name:string;k:number}[] = '+json.dumps(out,ensure_ascii=False,indent=1)+';\n'
 'export const DEFAULT_MATERIALS: {name:string;roughness:number;c:number}[] = '+json.dumps([{'name':a,'roughness':b,'c':c} for a,b,c in mat],ensure_ascii=False,indent=1)+';\n')
