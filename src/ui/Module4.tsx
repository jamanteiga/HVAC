import { useEffect, useState } from 'react';
import { Button, Card, Input, Title3, Subtitle2, MessageBar, MessageBarBody, Field, TabList, Tab, Text } from '@fluentui/react-components';
import { Save24Regular, FolderOpen24Regular, Copy24Regular, Delete24Regular, DocumentAdd24Regular } from '@fluentui/react-icons';
import { User } from 'firebase/auth';
import { useStore } from '../store';
import { authApi, firebaseConfigured, firebaseRepo, localRepo, ProjectMeta, Repo } from '../db';

export function Module4() {
  const { project, setProject, reset } = useStore();
  const [kind, setKind] = useState<'local' | 'firebase'>(firebaseConfigured ? 'firebase' : 'local');
  const [list, setList] = useState<ProjectMeta[]>([]); const [msg, setMsg] = useState<{ t: 'info' | 'error' | 'success'; m: string } | null>(null);
  const [user, setUser] = useState<User | null>(null); const [email, setEmail] = useState(''); const [pwd, setPwd] = useState('');
  const repo: Repo = kind === 'firebase' ? firebaseRepo : localRepo;
  const ready = kind === 'local' || !!user;

  useEffect(() => authApi.onChange(setUser), []);
  const refresh = async () => { if (!ready) { setList([]); return; } try { setList(await repo.list()); } catch (e: any) { setMsg({ t: 'error', m: e.message }); } };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [kind, user]);
  const guard = async (fn: () => Promise<void>, ok: string) => { try { await fn(); setMsg({ t: 'success', m: ok }); await refresh(); } catch (e: any) { setMsg({ t: 'error', m: e.message }); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', overflow: 'auto' }}>
      <Card><Title3>Base de datos de proyectos</Title3>
        <TabList selectedValue={kind} onTabSelect={(_, d) => setKind(d.value as any)}>
          <Tab value="firebase" disabled={!firebaseConfigured}>Firebase (nube)</Tab><Tab value="local">Local (este equipo)</Tab></TabList>
        {!firebaseConfigured && <MessageBar intent="info"><MessageBarBody>Firebase no está configurado: completa <code>.env</code> (ver <code>.env.example</code>) y recompila. Mientras tanto, los proyectos se guardan en este navegador.</MessageBarBody></MessageBar>}
        {kind === 'firebase' && firebaseConfigured && (user ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><Text>Sesión: <b>{user.email}</b></Text><Button size="small" onClick={() => authApi.logout()}>Cerrar sesión</Button></div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label="Correo"><Input value={email} onChange={(_, v) => setEmail(v.value)} /></Field>
            <Field label="Contraseña"><Input type="password" value={pwd} onChange={(_, v) => setPwd(v.value)} /></Field>
            <Button appearance="primary" onClick={() => guard(async () => { await authApi.login(email, pwd); }, 'Sesión iniciada')}>Entrar</Button>
            <Button onClick={() => guard(async () => { await authApi.register(email, pwd); }, 'Cuenta creada')}>Crear cuenta</Button></div>))}
        {msg && <MessageBar intent={msg.t}><MessageBarBody>{msg.m}</MessageBarBody></MessageBar>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button appearance="primary" icon={<Save24Regular />} disabled={!ready} onClick={() => guard(() => repo.save(project), 'Proyecto guardado')}>Guardar proyecto actual</Button>
          <Button icon={<DocumentAdd24Regular />} onClick={() => { if (confirm('Se descartarán los cambios sin guardar del proyecto actual. ¿Crear un proyecto nuevo?')) reset(); }}>Proyecto nuevo</Button>
          <Text style={{ alignSelf: 'center', color: '#616161' }}>Actual: <b>{project.design.nombre || 'sin nombre'}</b></Text></div>
      </Card>
      <Card><Subtitle2>Proyectos guardados ({list.length})</Subtitle2>
        <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
          <thead><tr>{['Nombre', 'Código', 'Cliente', 'Tipo', 'Modificado', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', background: '#f3f3f3', borderBottom: '1px solid #e0e0e0' }}>{h}</th>)}</tr></thead>
          <tbody>{list.map(m => (
            <tr key={m.id}><td style={td}>{m.nombre || '(sin nombre)'}</td><td style={td}>{m.codigo}</td><td style={td}>{m.cliente}</td><td style={td}>{m.tipoBuque}</td><td style={td}>{new Date(m.updatedAt).toLocaleString('es-ES')}</td>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                <Button size="small" icon={<FolderOpen24Regular />} onClick={() => guard(async () => { const p = await repo.load(m.id); if (!p) throw new Error('No encontrado'); setProject(p); }, 'Proyecto recuperado')}>Abrir</Button>{' '}
                <Button size="small" icon={<Copy24Regular />} onClick={() => { const n = prompt('Nombre del nuevo proyecto', `${m.nombre} (copia)`); if (n) guard(async () => { await repo.copy(m.id, n); }, 'Proyecto copiado'); }}>Copiar a nuevo</Button>{' '}
                <Button size="small" icon={<Delete24Regular />} onClick={() => { if (confirm(`¿Eliminar «${m.nombre}»? Esta acción no se puede deshacer.`)) guard(() => repo.remove(m.id), 'Proyecto eliminado'); }}>Eliminar</Button></td></tr>))}
            {!list.length && <tr><td colSpan={6} style={{ ...td, color: '#616161' }}>{ready ? 'Sin proyectos guardados.' : 'Inicia sesión para ver tus proyectos.'}</td></tr>}</tbody>
        </table></Card>
    </div>
  );
}
const td: React.CSSProperties = { padding: '6px 10px', borderBottom: '1px solid #f0f0f0' };
