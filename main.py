from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager

# ==========================================
# 1. MODELOS DE DATOS Y ROLES
# ==========================================
class AuditLog(BaseModel):
    timestamp: str
    user_role: str
    event: str
    severity: str  # "INFO", "WARNING", "CRITICAL"

class MachineState(BaseModel):
    system_running: bool = False
    tank_level: float = 100.0
    conveyor_running: bool = False
    bottle_position: float = 0.0
    bottle_present: bool = False
    fill_valve_open: bool = False
    current_bottle_volume: float = 0.0
    target_volume: float = 500.0
    filled_bottles_count: int = 0
    alarm_low_tank: bool = False
    current_user_role: str = "Operador"
    tank_history: List[float] = []

# Base de datos en memoria
state = MachineState()
audit_logs: List[AuditLog] = []

# Usuarios predefinidos (PINs de Planta)
USERS = {
    "1234": {"name": "Carlos López", "role": "Operador"},
    "9999": {"name": "Ing. Edgar Ruiz", "role": "Ingeniero de Mantenimiento"}
}

def add_log(event: str, role: str = "SISTEMA", severity: str = "INFO"):
    now = datetime.now().strftime("%H:%M:%S")
    audit_logs.insert(0, AuditLog(timestamp=now, user_role=role, event=event, severity=severity))
    if len(audit_logs) > 30:
        audit_logs.pop()

# ==========================================
# 2. BUCLE DE SIMULACIÓN DEL PLC
# ==========================================
async def plc_scan_cycle():
    global state
    add_log("PLC Virtual iniciado en modo AUTOMÁTICO", "SISTEMA", "INFO")
    
    while True:
        await asyncio.sleep(0.1)  # Ciclo de 100ms

        # Guardar historial de nivel para la gráfica (últimas 30 muestras)
        state.tank_history.append(state.tank_level)
        if len(state.tank_history) > 30:
            state.tank_history.pop(0)

        if not state.system_running or state.alarm_low_tank:
            state.conveyor_running = False
            state.fill_valve_open = False
            continue

        # Alarma de bajo nivel
        if state.tank_level <= 15.0 and not state.alarm_low_tank:
            state.alarm_low_tank = True
            state.system_running = False
            add_log("PARO DE EMERGENCIA: Bajo nivel de líquido en Tanque T-01 (<15%)", "PLC", "CRITICAL")
            continue

        # Lógica de Banda
        if not state.bottle_present and not state.fill_valve_open:
            state.conveyor_running = True
            state.bottle_position += 25.0
            if state.bottle_position >= 500.0:
                state.bottle_position = 500.0
                state.bottle_present = True
                state.conveyor_running = False

        # Lógica de Llenado
        if state.bottle_present:
            if state.current_bottle_volume < state.target_volume:
                state.fill_valve_open = True
                state.current_bottle_volume += 20.0
                state.tank_level -= 0.4
            else:
                state.fill_valve_open = False
                state.filled_bottles_count += 1
                state.current_bottle_volume = 0.0
                state.bottle_present = False
                state.bottle_position = 501.0
                add_log(f"Botella #{state.filled_bottles_count} dosificada con éxito (500mL)", "PLC", "INFO")

        if state.bottle_position >= 1000.0:
            state.bottle_position = 0.0

@asynccontextmanager
async def lifespan(app: FastAPI):
    sim_task = asyncio.create_task(plc_scan_cycle())
    yield
    sim_task.cancel()

app = FastAPI(title="SCADA Embotelladora - Enterprise", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 3. VERIFICACIÓN DE SEGURIDAD (RBAC)
# ==========================================
def verify_engineer_role(x_user_pin: Optional[str] = Header(None)):
    user = USERS.get(x_user_pin)
    if not user or user["role"] != "Ingeniero de Mantenimiento":
        raise HTTPException(
            status_code=403, 
            detail="Acceso denegado: Se requieren privilegios de Ingeniero de Mantenimiento."
        )
    return user

# ==========================================
# 4. ENDPOINTS SCADA & AUTENTICACIÓN
# ==========================================
class LoginRequest(BaseModel):
    pin: str

@app.post("/api/auth/login")
async def login(req: LoginRequest):
    user = USERS.get(req.pin)
    if not user:
        raise HTTPException(status_code=401, detail="PIN incorrecto")
    state.current_user_role = user["role"]
    add_log(f"Inicio de sesión exitoso: {user['name']} ({user['role']})", user['role'], "INFO")
    return {"status": "ok", "user": user}

@app.get("/api/telemetry")
async def get_telemetry():
    return {"state": state, "logs": audit_logs}

@app.post("/api/control/start")
async def start_system():
    if state.alarm_low_tank:
        return {"status": "error", "message": "Imposible arrancar: Alarma activa"}
    state.system_running = True
    add_log("Comando ARRANQUE DE LÍNEA ejecutado", state.current_user_role, "WARNING")
    return {"status": "ok"}

@app.post("/api/control/stop")
async def stop_system():
    state.system_running = False
    add_log("PARO MANUAL DE PRODUCCIÓN solicitado", state.current_user_role, "WARNING")
    return {"status": "ok"}

# Endpoint protegido: Solo Ingenieros pueden rellenar el tanque
@app.post("/api/control/refill-tank")
async def refill_tank(user: dict = Depends(verify_engineer_role)):
    state.tank_level = 100.0
    state.alarm_low_tank = False
    add_log(f"Reabastecimiento de materia prima autorizado por {user['name']}", user['role'], "INFO")
    return {"status": "ok"}

# Endpoint protegido: Solo Ingenieros pueden reiniciar contadores
@app.post("/api/control/reset-counter")
async def reset_counter(user: dict = Depends(verify_engineer_role)):
    state.filled_bottles_count = 0
    add_log(f"Contador de producción reseteado a cero por {user['name']}", user['role'], "WARNING")
    return {"status": "ok"}