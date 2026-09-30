const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  empresaId: string;
  roles: string[];
}

export interface Entidad {
  id: string;
  nombre: string;
  documentoTipo: string | null;
  documentoNro: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
  cliente: { categoria: string | null } | null;
  proveedor: { cbu: string | null } | null;
  // Distinto de proveedor: un acreedor es un compromiso general (alquiler,
  // servicio, préstamo) sin que medie compra de mercadería -- no son
  // excluyentes, ver NOTAS.md.
  acreedor: { tipoDeuda: string | null } | null;
  // null = todavía no tuvo ningún movimiento (nunca se creó la cuenta
  // corriente -- se crea sola al primer movimiento, ver NOTAS.md entrega 10).
  cuentaCorriente: {
    saldoActual: string;
    movimientos: { fecha: string }[];
  } | null;
}

export interface UnidadMedida {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: string | null;
  // Solo en GET /unidades-medida: cuántos productos la usan (incluye dados
  // de baja). Con productos no se puede borrar.
  _count?: { productos: number };
}

export interface Producto {
  id: string;
  nombre: string;
  sku: string | null;
  unidadMedidaId: string;
  unidadMedida?: UnidadMedida;
  precioUnitario: string;
  costo: string;
  stockMinimo: string | null;
  activo: boolean;
}

export interface DetalleRemito {
  id: string;
  productoId: string;
  producto: Producto;
  cantidad: string;
  precioUnitario: string;
  subtotal: string;
}

export interface Remito {
  id: string;
  numero: string | null;
  tipo: 'E' | 'S';
  fecha: string;
  entidadId: string | null;
  entidad: Entidad | null;
  estado: 'borrador' | 'emitido' | 'anulado';
  observaciones: string | null;
  detalles: DetalleRemito[];
  // Obligación creada automáticamente al emitir (si el remito tiene
  // entidad), ver RemitosService.emitir() en el backend.
  // Viene cruda de Prisma (no pasa por ObligacionesService), así que no trae
  // montoPagado/saldo/vencida calculados: sale de sumar `aplicaciones`, que
  // el backend ya filtra sin pagos anulados.
  obligacionGenerada?: {
    id: string;
    monto: string;
    estado: Obligacion['estado'];
    direccion: Obligacion['direccion'];
    fechaVencimiento: string | null;
    aplicaciones: { monto: string }[];
  } | null;
}

export interface MovimientoCuenta {
  id: string;
  fecha: string;
  tipo: string;
  concepto: string | null;
  monto: string;
  saldoResultante: string;
  referenciaId: string | null;
  // Resuelto en el backend a partir de referenciaId (ver
  // CuentasCorrientesService.conOrigen): de dónde vino el movimiento.
  origen?: {
    tipo: 'remito' | 'obligacion' | 'pago' | 'anulacion' | 'otro';
    obligacionId: string | null;
    remito: { id: string; numero: string | null } | null;
    pago: { id: string; medio: string | null; cheques: number } | null;
    anulado: boolean;
  };
}

export interface CuentaCorriente {
  entidadId: string;
  saldoActual: number | string;
  moneda: string;
  movimientos: MovimientoCuenta[];
}

export interface AplicacionPago {
  id: string;
  obligacionId: string;
  monto: string;
  obligacion?: Obligacion;
}

export interface Obligacion {
  id: string;
  entidadId: string | null;
  entidad: Entidad | null;
  tipo: string | null;
  descripcion: string | null;
  fechaVencimiento: string | null;
  monto: string;
  estado: 'pendiente' | 'parcial' | 'cancelada' | 'anulada';
  // a_cobrar: la entidad nos debe. a_pagar: nosotros le debemos a la
  // entidad. Ver Obligacion.direccion en el schema del backend.
  direccion: 'a_cobrar' | 'a_pagar';
  montoPagado: number;
  saldo: number;
  vencida: boolean;
  fechaEmision: string;
  // Seteado si se generó sola al emitir un remito.
  remitoId: string | null;
  remito?: { numero: string | null; fecha: string; tipo: 'E' | 'S' } | null;
}

export interface Cheque {
  id: string;
  numero: string | null;
  banco: string | null;
  monto: string | null;
  fechaEmision: string | null;
  fechaCobro: string | null;
  estado: string | null;
}

export interface Pago {
  id: string;
  entidadId: string | null;
  entidad: Entidad | null;
  fecha: string;
  medio: string | null;
  monto: string;
  estado: 'pendiente' | 'confirmado' | 'rechazado';
  aplicaciones: AplicacionPago[];
  cheques: Cheque[];
}

export interface Notificacion {
  id: string;
  canal: string;
  fechaProgramada: string;
  estado: string;
}

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  entidadId: string | null;
  entidad: Entidad | null;
  fechaVencimiento: string | null;
  estado: 'abierta' | 'en_proceso' | 'cumplida';
  // null cuenta como normal.
  prioridad: Prioridad | null;
  vencida: boolean;
  notificaciones: Notificacion[];
}

// Guardado en localStorage/sessionStorage a propósito: esto es un frontend
// de prueba interno, no la versión final. Antes de exponer esto a clientes
// reales conviene revisar el manejo de tokens en el cliente (XSS, httpOnly
// cookies para el refresh token, etc.) -- ver NOTAS.md.
//
// "No cerrar sesión" (checkbox de Login) decide el storage: marcado
// persiste en localStorage (sobrevive a cerrar el navegador); sin marcar
// usa sessionStorage (se pierde al cerrar la pestaña). REMEMBER_KEY vive
// siempre en localStorage porque hace falta saber cuál storage leer antes
// de tener la sesión misma.
const ACCESS_TOKEN_KEY = 'gestioya_access_token';
const REFRESH_TOKEN_KEY = 'gestioya_refresh_token';
const USUARIO_KEY = 'gestioya_usuario';
const REMEMBER_KEY = 'gestioya_remember';

function getSessionStorage(): Storage {
  const remember = localStorage.getItem(REMEMBER_KEY) === '1';
  return remember ? localStorage : sessionStorage;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getSessionStorage().getItem(ACCESS_TOKEN_KEY);
}

export function getUsuario(): Usuario | null {
  if (typeof window === 'undefined') return null;
  const raw = getSessionStorage().getItem(USUARIO_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(accessToken: string, refreshToken: string, usuario: Usuario, remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  storage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function clearSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(REFRESH_TOKEN_KEY);
    storage.removeItem(USUARIO_KEY);
  }
  localStorage.removeItem(REMEMBER_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getSessionStorage().getItem(REFRESH_TOKEN_KEY);
}

// Renovación en curso, compartida: si varias requests vencen a la vez se
// renueva una sola vez (el refresh token rota en cada uso, así que dos
// renovaciones en paralelo con el mismo token harían fallar a la segunda).
let renovacion: Promise<boolean> | null = null;

/**
 * Pide un access token nuevo con el refresh token (30 días, rota en cada
 * uso; ver AuthService.refresh). true si quedó una sesión válida.
 */
function renovarSesion(): Promise<boolean> {
  if (!renovacion) {
    renovacion = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (res.ok) {
          const data: { accessToken: string; refreshToken: string } = await res.json();
          const storage = getSessionStorage();
          storage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
          storage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          return true;
        }
        // Otra pestaña pudo haber renovado justo antes con el mismo token
        // (y rotado): si el guardado cambió, esa renovación sirve.
        return getRefreshToken() !== refreshToken;
      } catch {
        return false;
      }
    })().finally(() => {
      renovacion = null;
    });
  }
  return renovacion;
}

/**
 * fetch con el token de la sesión. Si el servidor responde 401 (el access
 * token dura 45 min), renueva la sesión y reintenta una vez; si no se puede
 * renovar, borra la sesión y devuelve el 401 (las pantallas mandan al login).
 */
async function fetchConSesion(path: string, options: RequestInit = {}): Promise<Response> {
  const intentar = () => {
    const token = getAccessToken();
    return fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  };

  const res = await intentar();
  if (res.status !== 401 || path.startsWith('/auth/') || !getRefreshToken()) return res;

  if (await renovarSesion()) return intentar();
  clearSession();
  return res;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetchConSesion(path, options);

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? res.statusText);
    throw new ApiError(res.status, message);
  }

  if (res.status === HTTP_NO_CONTENT) {
    return undefined as T;
  }

  return res.json();
}

const HTTP_NO_CONTENT = 204;

export async function login(email: string, password: string, remember = true) {
  const data = await request<{
    accessToken: string;
    refreshToken: string;
    usuario: Usuario;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setSession(data.accessToken, data.refreshToken, data.usuario, remember);
  return data.usuario;
}

export function listEntidades(params?: {
  nombre?: string;
  activo?: boolean;
  tipo?: 'cliente' | 'proveedor' | 'acreedor';
  orderBy?: 'nombre' | 'saldo';
  orderDir?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}) {
  const qs = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) qs.set(key, String(value));
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return request<{ data: Entidad[]; total: number; skip: number; take: number }>(
    `/entidades${suffix}`,
  );
}

export function createEntidad(input: {
  nombre: string;
  documentoTipo?: string;
  documentoNro?: string;
  email?: string;
  telefono?: string;
  esCliente?: boolean;
  esProveedor?: boolean;
  esAcreedor?: boolean;
}) {
  const { esCliente, esProveedor, esAcreedor, ...base } = input;
  return request<Entidad>('/entidades', {
    method: 'POST',
    body: JSON.stringify({
      ...base,
      cliente: esCliente ? {} : undefined,
      proveedor: esProveedor ? {} : undefined,
      acreedor: esAcreedor ? {} : undefined,
    }),
  });
}

export function deleteEntidad(id: string) {
  return request<void>(`/entidades/${id}`, { method: 'DELETE' });
}

export function upsertAcreedor(entidadId: string, input: { tipoDeuda?: string }) {
  return request<{ entidadId: string; tipoDeuda: string | null }>(
    `/entidades/${entidadId}/acreedor`,
    { method: 'PUT', body: JSON.stringify(input) },
  );
}

export function listUnidadesMedida() {
  return request<UnidadMedida[]>('/unidades-medida');
}

export function createUnidadMedida(input: {
  codigo: string;
  descripcion: string;
  tipo?: string;
}) {
  return request<UnidadMedida>('/unidades-medida', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateUnidadMedida(id: string, input: { codigo?: string; descripcion?: string }) {
  return request<UnidadMedida>(`/unidades-medida/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Borrado físico: solo si ningún producto la usa. */
export function deleteUnidadMedida(id: string) {
  return request<void>(`/unidades-medida/${id}`, { method: 'DELETE' });
}

export function listProductos(params?: {
  /** Nombre o SKU. */
  q?: string;
  activo?: boolean;
  skip?: number;
  take?: number;
}) {
  return request<{ data: Producto[]; total: number }>(`/productos${queryString(params)}`);
}

export function createProducto(input: {
  nombre: string;
  sku?: string;
  unidadMedidaId: string;
  precioUnitario?: number;
  costo?: number;
}) {
  return request<Producto>('/productos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** `sku: ""` lo borra. `activo: true` reactiva uno dado de baja. */
export function updateProducto(
  id: string,
  input: {
    nombre?: string;
    sku?: string;
    unidadMedidaId?: string;
    precioUnitario?: number;
    costo?: number;
    activo?: boolean;
  },
) {
  return request<Producto>(`/productos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Baja lógica (activo = false); se puede reactivar con updateProducto. */
export function deleteProducto(id: string) {
  return request<void>(`/productos/${id}`, { method: 'DELETE' });
}

// Fila del listado: sin detalles, con total y cantidad de líneas calculados
// en el servidor.
export type RemitoResumen = Omit<Remito, 'detalles' | 'obligacionGenerada'> & {
  lineas: number;
  total: string;
};

export function listRemitos(params?: {
  q?: string;
  tipo?: 'E' | 'S';
  estado?: Remito['estado'];
  entidadId?: string;
  skip?: number;
  take?: number;
}) {
  return request<{ data: RemitoResumen[]; total: number }>(`/remitos${queryString(params)}`);
}

export function getRemito(id: string) {
  return request<Remito>(`/remitos/${id}`);
}

export type DetalleRemitoInput = { productoId: string; cantidad: number; precioUnitario: number };

export function createRemito(input: {
  tipo: 'E' | 'S';
  entidadId?: string;
  fecha?: string;
  observaciones?: string;
  detalles: DetalleRemitoInput[];
}) {
  return request<Remito>('/remitos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** Solo en borrador. `entidadId: null` le saca la entidad. */
export function updateRemito(
  id: string,
  input: {
    tipo?: 'E' | 'S';
    entidadId?: string | null;
    fecha?: string;
    /** "" las borra. */
    observaciones?: string;
    detalles?: DetalleRemitoInput[];
  },
) {
  return request<Remito>(`/remitos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

/** Borra un borrador (emitidos y anulados no se pueden borrar). */
export function deleteRemitoBorrador(id: string) {
  return request<{ id: string; eliminado: true }>(`/remitos/${id}`, { method: 'DELETE' });
}

export function emitirRemito(id: string) {
  return request<Remito>(`/remitos/${id}/emitir`, { method: 'POST' });
}

export function anularRemito(id: string) {
  return request<Remito>(`/remitos/${id}/anular`, { method: 'POST' });
}

/**
 * Abre el PDF en una pestaña nueva (el handoff lo pide así). El endpoint
 * exige el token en el header, así que un <a href> plano no alcanza: se pide
 * como blob. La pestaña se abre antes del fetch, todavía dentro del click: si
 * se abriera después del await, el navegador la bloquearía como popup.
 */
export async function openRemitoPdf(id: string, filename: string) {
  const ventana = window.open('', '_blank');
  const res = await fetchConSesion(`/remitos/${id}/pdf`);
  if (!res.ok) {
    ventana?.close();
    throw new ApiError(res.status, 'No se pudo generar el PDF');
  }
  const url = URL.createObjectURL(await res.blob());
  if (ventana) {
    ventana.location.href = url;
  } else {
    // Popups bloqueados: se descarga.
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }
  // La pestaña nueva necesita la URL un rato; después se libera.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function getCuentaCorriente(entidadId: string) {
  return request<CuentaCorriente>(`/entidades/${entidadId}/cuenta-corriente`);
}

function queryString(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function getEntidad(id: string) {
  return request<Entidad>(`/entidades/${id}`);
}

export function listObligaciones(params?: {
  entidadId?: string;
  /** Gastos generales: obligaciones sin entidad. */
  sinEntidad?: boolean;
  /** 'abiertas' = pendiente + parcial. */
  estado?: Obligacion['estado'] | 'abiertas';
  direccion?: Obligacion['direccion'];
  tipoEntidad?: 'proveedor' | 'acreedor';
  orderDir?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}) {
  return request<{ data: Obligacion[]; total: number }>(`/obligaciones${queryString(params)}`);
}

export function createObligacion(input: {
  entidadId?: string;
  monto: number;
  tipo?: string;
  descripcion?: string;
  fechaVencimiento?: string;
  direccion?: 'a_cobrar' | 'a_pagar';
}) {
  return request<Obligacion>('/obligaciones', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function anularObligacion(id: string) {
  return request<Obligacion>(`/obligaciones/${id}/anular`, { method: 'POST' });
}

export function listPagos(params?: { entidadId?: string; skip?: number; take?: number }) {
  return request<{ data: Pago[]; total: number }>(`/pagos${queryString(params)}`);
}

export function createPago(input: {
  /** Sin entidad = pago de un gasto general de la empresa. */
  entidadId?: string;
  monto: number;
  medio?: string;
  aplicaciones?: { obligacionId: string; monto: number }[];
  cheques?: { numero?: string; banco?: string; monto?: number; fechaCobro?: string }[];
}) {
  return request<Pago>('/pagos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function anularPago(id: string) {
  return request<Pago>(`/pagos/${id}/anular`, { method: 'POST' });
}

export type Prioridad = 'alta' | 'normal' | 'baja';

export function listTareas(params?: {
  /** 'pendientes' = abierta + en_proceso. */
  estado?: Tarea['estado'] | 'pendientes';
  /** Pendientes con el vencimiento ya pasado. */
  vencidas?: boolean;
  skip?: number;
  take?: number;
}) {
  return request<{ data: Tarea[]; total: number }>(`/tareas${queryString(params)}`);
}

/** "Listo" en un recordatorio: deja de aparecer. */
export function marcarRecordatorioVisto(notificacionId: string) {
  return request<{ notificacionId: string; visto: true }>(`/tareas/recordatorios/${notificacionId}/visto`, {
    method: 'POST',
  });
}

export function getRecordatorios() {
  return request<
    { notificacionId: string; tareaId: string; titulo: string; fechaProgramada: string }[]
  >('/tareas/recordatorios');
}

export function createTarea(input: {
  titulo: string;
  descripcion?: string;
  entidadId?: string;
  fechaVencimiento?: string;
  prioridad?: Prioridad;
  notificaciones?: { canal: 'app' | 'email' | 'sms' | 'whatsapp'; fechaProgramada: string }[];
}) {
  return request<Tarea>('/tareas', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * En descripcion, entidadId, fechaVencimiento y recordatorio: null lo saca.
 * `recordatorio` reemplaza el aviso "app" pendiente de la tarea.
 */
export function updateTarea(
  id: string,
  input: {
    titulo?: string;
    descripcion?: string | null;
    entidadId?: string | null;
    fechaVencimiento?: string | null;
    prioridad?: Prioridad;
    estado?: Tarea['estado'];
    recordatorio?: string | null;
  },
) {
  return request<Tarea>(`/tareas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function updateTareaEstado(id: string, estado: 'abierta' | 'en_proceso' | 'cumplida') {
  return request<Tarea>(`/tareas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export function deleteTarea(id: string) {
  return request<void>(`/tareas/${id}`, { method: 'DELETE' });
}

export interface ResumenDireccion {
  total: number;
  vencido: number;
  cantidad: number;
  cantidadVencidas: number;
  vencenEstaSemana: number;
}

export interface DashboardResumen {
  aCobrar: ResumenDireccion;
  aPagar: ResumenDireccion;
  remitosMes: { total: number; emitidos: number; borradoresSinEmitir: number };
  paraReclamar: {
    id: string;
    descripcion: string | null;
    entidad: { id: string; nombre: string };
    fechaVencimiento: string | null;
    saldo: number;
    vencida: boolean;
  }[];
}

export type PeriodoFlujo = 'diario' | 'semanal' | 'mensual';

export interface DashboardFlujo {
  periodo: PeriodoFlujo;
  puntos: { clave: string; etiqueta: string; ingresos: number; egresos: number }[];
  totalIngresos: number;
  totalEgresos: number;
}

export function getDashboardResumen() {
  return request<DashboardResumen>('/dashboard/resumen');
}

export function getDashboardFlujo(periodo: PeriodoFlujo) {
  return request<DashboardFlujo>(`/dashboard/flujo?periodo=${periodo}`);
}
