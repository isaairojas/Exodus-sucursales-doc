// ============================================================
// APYMSA — ModalBasculaConfig
// Mini-modal de configuración de la báscula que se conecta al modal
// de documentación de cajas. El operador puede ingresar el peso
// manualmente O que la báscula lo lea automáticamente vía puerto serial.
// La integración real con hardware queda pendiente (MOCK).
// ============================================================
import { useState, useEffect } from 'react';

export interface BasculaConfig {
  activa: boolean;
  puerto: string;         // ej. 'COM3', '/dev/ttyUSB0'
  baudRate: number;       // 9600, 19200
  unidad: 'kg' | 'lb';
  tara: number;           // tara en kg descontada de la lectura
  autoAvance: boolean;    // pasa al siguiente input al leer un peso estable
}

const DEFAULT: BasculaConfig = {
  activa: false, puerto: 'COM3', baudRate: 9600, unidad: 'kg', tara: 0, autoAvance: true,
};

const LS_KEY = 'apymsa_bascula_config_v1';

// Persistencia local: la config sobrevive recarga de página. Se guarda por
// sucursal-usuario a nivel del navegador (no viaja al backend).
export function cargarBasculaConfig(): BasculaConfig | undefined {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<BasculaConfig>;
    return { ...DEFAULT, ...parsed };
  } catch { return undefined; }
}

export function guardarBasculaConfig(cfg: BasculaConfig): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); } catch {}
}

interface Props {
  valor?: BasculaConfig;
  onClose: () => void;
  onGuardar: (cfg: BasculaConfig) => void;
}

export default function ModalBasculaConfig({ valor, onClose, onGuardar }: Props) {
  const [cfg, setCfg] = useState<BasculaConfig>(valor ?? cargarBasculaConfig() ?? DEFAULT);
  // F82 — ESC cierra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const [probando, setProbando] = useState(false);
  const [ultimaLectura, setUltimaLectura] = useState<number | null>(null);

  // MOCK: la integración real usaría Web Serial API o un puente local.
  // Aquí simulamos una lectura fluctuando alrededor de un peso arbitrario.
  const probarConexion = async () => {
    setProbando(true);
    console.log('[MOCK] Báscula: intento de conexión', cfg.puerto, cfg.baudRate);
    await new Promise(r => setTimeout(r, 700));
    const lectura = Math.round((Math.random() * 20 + 1) * 100) / 100;
    setUltimaLectura(lectura);
    setProbando(false);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="w-full bg-white" style={{ maxWidth: 440, borderRadius: 18, fontFamily: 'Roboto, sans-serif', boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ background: '#1a2b6b', color: 'white', borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>scale</span>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Configuración de báscula</div>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-white/10" aria-label="Cerrar">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3" style={{ fontSize: 13, color: '#0f172a' }}>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.activa} onChange={e => setCfg({ ...cfg, activa: e.target.checked })} />
            <span>Usar báscula conectada (lectura automática)</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Puerto</div>
              <input
                value={cfg.puerto}
                onChange={e => setCfg({ ...cfg, puerto: e.target.value })}
                disabled={!cfg.activa}
                className="w-full rounded px-2 py-1"
                style={{ border: '1px solid #cbd5e1', fontSize: 13 }}
                placeholder="COM3"
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Baud rate</div>
              <select
                value={cfg.baudRate}
                onChange={e => setCfg({ ...cfg, baudRate: Number(e.target.value) })}
                disabled={!cfg.activa}
                className="w-full rounded px-2 py-1"
                style={{ border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value={9600}>9600</option>
                <option value={19200}>19200</option>
                <option value={38400}>38400</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Unidad</div>
              <select
                value={cfg.unidad}
                onChange={e => setCfg({ ...cfg, unidad: e.target.value as 'kg' | 'lb' })}
                className="w-full rounded px-2 py-1"
                style={{ border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="kg">Kilogramos (kg)</option>
                <option value="lb">Libras (lb)</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>Tara (kg)</div>
              <input
                type="number" step="0.01" min="0"
                value={cfg.tara}
                onChange={e => setCfg({ ...cfg, tara: Number(e.target.value) })}
                className="w-full rounded px-2 py-1"
                style={{ border: '1px solid #cbd5e1', fontSize: 13 }}
              />
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={cfg.autoAvance} onChange={e => setCfg({ ...cfg, autoAvance: e.target.checked })} />
            <span>Avanzar al siguiente campo cuando la lectura es estable</span>
          </label>

          <div className="rounded p-3 flex items-center justify-between" style={{ background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Última lectura de prueba</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: ultimaLectura != null ? '#16a34a' : '#94a3b8' }}>
                {ultimaLectura != null ? `${ultimaLectura} ${cfg.unidad}` : '— sin prueba —'}
              </div>
            </div>
            <button
              onClick={probarConexion}
              disabled={!cfg.activa || probando}
              className="px-3 py-1.5 rounded text-white font-semibold"
              style={{ background: cfg.activa ? '#1a2b6b' : '#94a3b8', fontSize: 12 }}
            >
              {probando ? 'Probando…' : 'Probar conexión'}
            </button>
          </div>

          <div style={{ fontSize: 11, color: '#64748b' }}>
            Nota: la integración con hardware real está pendiente (MOCK).
            La lectura simulada devuelve un peso aleatorio para pruebas.
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e5e7eb', background: '#f8fafc', borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }}>
          <button
            onClick={() => {
              try { localStorage.removeItem('apymsa_bascula_config_v1'); } catch {}
              setCfg(DEFAULT);
            }}
            className="px-3 py-1.5 rounded font-semibold mr-auto"
            style={{ background: 'white', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12 }}
            title="Restablecer valores por defecto y borrar configuración guardada"
          >
            Reset
          </button>
          <button onClick={onClose} className="px-3 py-1.5 rounded font-semibold" style={{ background: 'white', color: '#64748b', border: '1px solid #cbd5e1', fontSize: 12 }}>
            Cancelar
          </button>
          <button onClick={() => onGuardar(cfg)} className="px-3 py-1.5 rounded text-white font-semibold" style={{ background: '#16a34a', fontSize: 12 }}>
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
}
