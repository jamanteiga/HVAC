import { useState } from 'react';
import { FluentProvider, webLightTheme, Tab, TabList, Text } from '@fluentui/react-components';
import { Home24Regular, Home24Filled, DataBarVertical24Regular, DataBarVertical24Filled, Document24Regular, Document24Filled, Database24Regular, Database24Filled, Flash24Filled, Flash24Regular, bundleIcon } from '@fluentui/react-icons';
import { Module1 } from './ui/Module1';
import { Module2 } from './ui/Module2';
import { Module3 } from './ui/Module3';
import { Module4 } from './ui/Module4';
import { Module5 } from './ui/Module5';
import { useStore } from './store';

const I1 = bundleIcon(Home24Filled, Home24Regular), I2 = bundleIcon(DataBarVertical24Filled, DataBarVertical24Regular), I3 = bundleIcon(Document24Filled, Document24Regular), I4 = bundleIcon(Database24Filled, Database24Regular), I5 = bundleIcon(Flash24Filled, Flash24Regular);

export default function App() {
  const [m, setM] = useState('1'); const d = useStore(s => s.project.design);
  return (
    <FluentProvider theme={webLightTheme} style={{ height: '100%', background: '#f3f3f3' }}>
      <div style={{ display: 'flex', height: '100%' }}>
        <nav style={{ width: 232, padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 12, background: '#eef0f3', borderRight: '1px solid #e0e0e0' }}>
          <div style={{ padding: '4px 12px' }}><div style={{ fontSize: 20, fontWeight: 700, letterSpacing: .3 }}>HVAC</div><Text size={200} style={{ color: '#616161' }}>Ventilación naval</Text></div>
          <TabList vertical selectedValue={m} onTabSelect={(_, x) => setM(x.value as string)} size="large">
            <Tab value="1" icon={<I1 />}>1 · Datos de diseño</Tab>
            <Tab value="2" icon={<I2 />}>2 · Ductos</Tab>
            <Tab value="3" icon={<I3 />}>3 · Reportes</Tab>
            <Tab value="4" icon={<I4 />}>4 · Proyectos</Tab>
            <Tab value="5" icon={<I5 />}>5 · Dimensionado rápido</Tab>
          </TabList>
        </nav>
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: 16, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <Text weight="semibold" size={500}>{d.nombre || 'Proyecto sin nombre'}</Text>
            <Text style={{ color: '#616161' }}>{[d.codigo, d.buque, d.tipoBuque].filter(Boolean).join(' · ')}</Text>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>{m === '1' && <Module1 />}{m === '2' && <Module2 />}{m === '3' && <Module3 />}{m === '4' && <Module4 />}{m === '5' && <Module5 />}</div>
        </main>
      </div>
    </FluentProvider>
  );
}
