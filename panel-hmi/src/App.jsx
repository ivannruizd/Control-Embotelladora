import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Droplet, 
  Box, 
  Gauge, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Activity, 
  FileText,
  User
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [data, setData] = useState(null);
  const [currentUser, setCurrentUser] = useState({ name: 'Operador General', role: 'Operador' });
  const [userPin, setUserPin] = useState('1234');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Polling continuo a 150ms
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/telemetry`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Error leyendo SCADA:", err);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      if (!res.ok) throw new Error("PIN Inválido");
      const result = await res.json();
      setCurrentUser(result.user);
      setUserPin(pinInput);
      setShowLoginModal(false);
      setPinInput('');
      setAuthError('');
    } catch (err) {
      setAuthError("PIN incorrecto. Prueba '1234' (Operador) o '9999' (Ingeniero)");
    }
  };

  const sendControl = async (endpoint, requiresAuth = false) => {
    try {
      const headers = requiresAuth ? { 'x-user-pin': userPin } : {};
      const res = await fetch(`${API_BASE}/control/${endpoint}`, { method: 'POST', headers });
      if (res.status === 403) {
        alert("🔒 ACCESO DENEGADO: Requiere rol de 'Ingeniero de Mantenimiento'. Cambia de usuario con PIN: 9999.");
      }
    } catch (err) {
      console.error(`Error enviando comando ${endpoint}:`, err);
    }
  };

  if (!data) {
    return <div style={styles.loading}>Conectando con Servidor SCADA e ISA-101...</div>;
  }

  const { state, logs } = data;
  const isEngineer = currentUser.role === 'Ingeniero de Mantenimiento';

  // Renderizador de gráfica SVG de tendencia histórica del tanque
  const renderTrendLine = () => {
    const points = state.tank_history || [];
    if (points.length < 2) return null;
    const width = 280;
    const height = 60;
    const pathD = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - (val / 100) * height;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} style={{ overflow: 'visible', marginTop: '10px' }}>
        <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      </svg>
    );
  };

  return (
    <div style={styles.container}>
      {/* BARRA SUPERIOR DE AUTENTICACIÓN Y ROLES */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>SISTEMA SCADA - LÍNEA EMBOTELLADORA</h1>
          <p style={styles.subtitle}>Supervisión en Tiempo Real | Cumplimiento ISA-101 & 21 CFR Part 11</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={styles.userBadge}>
            <User size={16} />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.7rem', color: isEngineer ? '#f59e0b' : '#38bdf8' }}>
                {currentUser.role}
              </div>
            </div>
          </div>

          <button onClick={() => setShowLoginModal(true)} style={styles.btnAuth}>
            {isEngineer ? <ShieldCheck size={16} /> : <Lock size={16} />} Cambiar Rol
          </button>
        </div>
      </header>

      {/* MODAL DE AUTENTICACIÓN POR PIN */}
      {showLoginModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3><Lock size={20} /> Autenticación de Personal</h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Ingrese su PIN de credencial (Ej: <b>1234</b> para Operador, <b>9999</b> para Ingeniero):
            </p>
            <input 
              type="password" 
              value={pinInput} 
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN de acceso"
              style={styles.input}
              maxLength={4}
            />
            {authError && <div style={styles.authError}>{authError}</div>}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button onClick={handleLogin} style={styles.btnStart(false)}>Ingresar</button>
              <button onClick={() => setShowLoginModal(false)} style={styles.btnSecondary}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* PANEL DE CONTROL SUPERVISORIO */}
      <div style={styles.controlPanel}>
        <button 
          onClick={() => sendControl('start')} 
          disabled={state.system_running || state.alarm_low_tank}
          style={styles.btnStart(state.system_running || state.alarm_low_tank)}
        >
          <Play size={18} /> ARRANQUE LÍNEA
        </button>

        <button 
          onClick={() => sendControl('stop')} 
          disabled={!state.system_running}
          style={styles.btnStop(!state.system_running)}
        >
          <Square size={18} /> PARO DE EMERGENCIA
        </button>

        {/* BOTÓN PROTEGIDO POR RBAC */}
        <button 
          onClick={() => sendControl('refill-tank', true)} 
          style={styles.btnProtected(isEngineer)}
        >
          {isEngineer ? <Unlock size={16} /> : <Lock size={16} />} RELLENAR TANQUE
        </button>

        {/* BOTÓN PROTEGIDO POR RBAC */}
        <button 
          onClick={() => sendControl('reset-counter', true)} 
          style={styles.btnProtected(isEngineer)}
        >
          {isEngineer ? <Unlock size={16} /> : <Lock size={16} />} RESET CONTADOR
        </button>
      </div>

      {/* VISUALIZACIÓN DEL GEMELO DIGITAL */}
      <div style={styles.twinGrid}>
        
        {/* TANQUE Y GRÁFICA DE TENDENCIA */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}><Droplet size={18} /> Tanque T-01 & Tendencia</h3>
          <div style={styles.tankOuter}>
            <div style={styles.tankInner(state.tank_level)} />
            <div style={styles.tankLabel}>{state.tank_level.toFixed(1)}%</div>
          </div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={14} /> Nivel en Tiempo Real (Histórico 3s)
            </div>
            {renderTrendLine()}
          </div>
        </div>

        {/* BANDA Y ESTACIÓN DE DOSIFICACIÓN */}
        <div style={{ ...styles.card, flex: 2 }}>
          <h3 style={styles.cardTitle}><Box size={18} /> Estación de Llenado M-02</h3>
          <div style={styles.valveArea}>
            <div style={styles.valveIndicator(state.fill_valve_open)}>
              SOLENOIDE V-01: {state.fill_valve_open ? 'ABIERTA' : 'CERRADA'}
            </div>
            {state.fill_valve_open && <div style={styles.streamAnimation} />}
          </div>

          <div style={styles.conveyorTrack}>
            <div style={styles.sensorMarker}>| SENSOR S-01 (500mm)</div>
            <div style={styles.bottleContainer(state.bottle_position)}>
              <div style={styles.bottleBody}>
                <div style={styles.bottleLiquid(state.current_bottle_volume, state.target_volume)} />
              </div>
              <span style={styles.bottleText}>{state.current_bottle_volume.toFixed(0)} mL</span>
            </div>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '12px' }}>
            BANDA B-01: <b>{state.conveyor_running ? 'EN MOVIMIENTO ▶' : 'DETENIDA ❚❚'}</b> | 
            POSICIÓN: <b>{state.bottle_position.toFixed(0)} mm</b>
          </div>
        </div>

      </div>

      {/* BITÁCORA DE EVENTOS Y REGISTRO DE AUDITORÍA */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}><FileText size={18} /> Registro de Auditoría y Eventos de Planta (21 CFR Part 11)</h3>
        <div style={styles.logTableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={{ color: '#94a3b8', textAlign: 'left', borderBottom: '1px solid #334155' }}>
                <th style={styles.th}>Hora</th>
                <th style={styles.th}>Origen / Rol</th>
                <th style={styles.th}>Nivel</th>
                <th style={styles.th}>Descripción del Evento</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #1e293b', fontSize: '0.85rem' }}>
                  <td style={styles.td}>{log.timestamp}</td>
                  <td style={styles.td}><b>{log.user_role}</b></td>
                  <td style={styles.td}>
                    <span style={styles.severityBadge(log.severity)}>{log.severity}</span>
                  </td>
                  <td style={styles.td}>{log.event}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ESTILOS INDUSTRIALES HMI (ISA-101)
const styles = {
  container: { backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', padding: '24px', fontFamily: 'sans-serif' },
  loading: { backgroundColor: '#0f172a', color: '#38bdf8', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '20px' },
  title: { fontSize: '1.4rem', margin: 0, color: '#38bdf8' },
  subtitle: { margin: 0, fontSize: '0.8rem', color: '#94a3b8' },
  userBadge: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#1e293b', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155' },
  btnAuth: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  controlPanel: { display: 'flex', gap: '12px', marginBottom: '20px' },
  btnStart: (disabled) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: disabled ? '#1e293b' : '#059669', color: disabled ? '#64748b' : '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer' }),
  btnStop: (disabled) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: disabled ? '#1e293b' : '#dc2626', color: disabled ? '#64748b' : '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: disabled ? 'not-allowed' : 'pointer' }),
  btnProtected: (active) => ({ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', backgroundColor: active ? '#d97706' : '#334155', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }),
  btnSecondary: { padding: '8px 16px', backgroundColor: '#475569', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  twinGrid: { display: 'flex', gap: '20px', marginBottom: '20px' },
  card: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '18px', boxSizing: 'border-box' },
  cardTitle: { margin: '0 0 14px 0', fontSize: '0.95rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' },
  tankOuter: { width: '100%', height: '160px', backgroundColor: '#0f172a', border: '2px solid #475569', borderRadius: '6px', position: 'relative', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  tankInner: (level) => ({ width: '100%', height: `${level}%`, backgroundColor: '#0284c7', transition: 'height 0.2s ease-in-out' }),
  tankLabel: { position: 'absolute', width: '100%', textAlign: 'center', top: '40%', fontWeight: 'bold', fontSize: '1.2rem', textShadow: '0 0 4px #000' },
  valveArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', height: '50px' },
  valveIndicator: (active) => ({ padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: active ? '#0284c7' : '#334155', color: active ? '#fff' : '#94a3b8' }),
  streamAnimation: { width: '4px', height: '24px', backgroundColor: '#38bdf8' },
  conveyorTrack: { position: 'relative', height: '90px', backgroundColor: '#0f172a', borderBottom: '4px solid #475569', borderRadius: '4px', overflow: 'hidden' },
  sensorMarker: { position: 'absolute', left: '50%', top: '5px', color: '#f59e0b', fontSize: '0.65rem', borderLeft: '1px dashed #f59e0b', height: '70px', paddingLeft: '4px' },
  bottleContainer: (pos) => ({ position: 'absolute', left: `${(pos / 1000) * 85}%`, bottom: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'left 0.1s linear' }),
  bottleBody: { width: '24px', height: '42px', border: '2px solid #cbd5e1', borderRadius: '3px 3px 0 0', position: 'relative', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-end', overflow: 'hidden' },
  bottleLiquid: (vol, target) => ({ width: '100%', height: `${(vol / target) * 100}%`, backgroundColor: '#38bdf8' }),
  bottleText: { fontSize: '0.6rem', color: '#94a3b8' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#1e293b', border: '1px solid #475569', padding: '24px', borderRadius: '8px', width: '320px' },
  input: { width: '100%', padding: '10px', backgroundColor: '#0f172a', border: '1px solid #475569', color: '#fff', borderRadius: '4px', marginTop: '10px', boxSizing: 'border-box' },
  authError: { color: '#ef4444', fontSize: '0.75rem', marginTop: '8px' },
  logTableContainer: { maxHeight: '180px', overflowY: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px', fontSize: '0.75rem' },
  td: { padding: '8px' },
  severityBadge: (sev) => ({
    padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold',
    backgroundColor: sev === 'CRITICAL' ? '#7f1d1d' : sev === 'WARNING' ? '#78350f' : '#064e3b',
    color: sev === 'CRITICAL' ? '#fca5a5' : sev === 'WARNING' ? '#fde68a' : '#6ee7b7'
  })
};