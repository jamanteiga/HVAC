import { useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry, ColDef } from 'ag-grid-community';
import { gridThemeFor, useUi } from '../theme';
import { Button, Toolbar, ToolbarButton, ToolbarDivider, Tooltip } from '@fluentui/react-components';
import { Add24Regular, ArrowUp24Regular, ArrowDown24Regular, Delete24Regular, ArrowUpload24Regular } from '@fluentui/react-icons';

ModuleRegistry.registerModules([AllCommunityModule]);


/** Color de fondo con texto oscuro legible en cualquier tema. */
export const paint = (bg?: string, bold = true) => (bg ? { backgroundColor: bg, color: '#111', fontWeight: bold ? 600 : 400 } : undefined);
export const COLORS = { blue: '#9cc8f0', green: 'rgb(0,255,0)', red: '#ff6b6b', orange: '#ffb347', warn: '#fff4ce', softGreen: '#9be69b' };

export const parseNum = (v: any): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
export const fmt = (d = 2) => (p: { value: any }) => (p.value == null || p.value === '' || (typeof p.value === 'number' && !Number.isFinite(p.value)) ? '' : typeof p.value === 'number' ? p.value.toLocaleString('es-ES', { maximumFractionDigits: d }) : String(p.value));

export const numCol = (field: string, headerName: string, o: Partial<ColDef> & { d?: number } = {}): ColDef => ({
  field, headerName, editable: true, type: 'numericColumn', width: 100, valueParser: p => parseNum(p.newValue), valueFormatter: fmt(o.d ?? 2), ...o,
});
export const calcCol = (headerName: string, getter: (d: any) => any, o: Partial<ColDef> & { d?: number } = {}): ColDef => ({
  headerName, editable: false, type: 'numericColumn', width: 100, valueGetter: p => (p.data ? getter(p.data) : null), valueFormatter: fmt(o.d ?? 2),
  headerClass: 'calc-header', ...o,
});

interface Props {
  rows: any[]; columns: ColDef[]; selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, field: string, value: any) => void;
  onAdd?: () => void; onInsert?: (id: string, where: 'above' | 'below') => void; onRemove?: (id: string) => void;
  onImport?: (file: File) => Promise<void>;
  extra?: React.ReactNode; message?: string; rowStyle?: (d: any) => any;
}

export function DataGrid(p: Props) {
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const defaultColDef = useMemo<ColDef>(() => ({ resizable: true, sortable: false, minWidth: 60, wrapHeaderText: true, autoHeaderHeight: true }), []);
  const sel = p.selectedId; const theme = useUi(s => s.theme);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <Toolbar size="small" style={{ background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {p.onAdd && <Tooltip content="Añadir línea al final" relationship="label"><ToolbarButton icon={<Add24Regular />} onClick={p.onAdd}>Añadir</ToolbarButton></Tooltip>}
        {p.onInsert && <ToolbarButton icon={<ArrowUp24Regular />} disabled={!sel} onClick={() => sel && p.onInsert!(sel, 'above')}>Insertar encima</ToolbarButton>}
        {p.onInsert && <ToolbarButton icon={<ArrowDown24Regular />} disabled={!sel} onClick={() => sel && p.onInsert!(sel, 'below')}>Insertar debajo</ToolbarButton>}
        {p.onRemove && <ToolbarButton icon={<Delete24Regular />} disabled={!sel} onClick={() => sel && p.onRemove!(sel)}>Eliminar</ToolbarButton>}
        {p.onImport && <><ToolbarDivider />
          <ToolbarButton icon={<ArrowUpload24Regular />} disabled={busy} onClick={() => file.current?.click()}>Importar Excel…</ToolbarButton>
          <input ref={file} type="file" accept=".xlsx,.xlsm" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setBusy(true); try { await p.onImport!(f); } finally { setBusy(false); } }} /></>}
        {p.extra}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--subtle)', paddingRight: 8 }}>{p.message ?? `${p.rows.length} filas`}</span>
      </Toolbar>
      <div style={{ flex: 1, minHeight: 0 }}>
        <AgGridReact
          theme={gridThemeFor(theme)} rowData={p.rows} columnDefs={p.columns} defaultColDef={defaultColDef}
          getRowId={x => x.data.uid} rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}
          onSelectionChanged={e => p.onSelect(e.api.getSelectedRows()[0]?.uid ?? null)}
          onCellValueChanged={e => { if (e.colDef.field && e.newValue !== e.oldValue) p.onChange(e.data.uid, e.colDef.field, e.newValue); }}
          stopEditingWhenCellsLoseFocus enterNavigatesVertically enterNavigatesVerticallyAfterEdit
          getRowStyle={p.rowStyle ? (x => p.rowStyle!(x.data)) : undefined}
          localeText={{ noRowsToShow: 'Sin datos. Añade líneas o importa desde Excel.' }}
        />
      </div>
    </div>
  );
}
export { Button };
