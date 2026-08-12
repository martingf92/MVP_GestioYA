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
}

export interface UnidadMedida {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: string | null;
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
  detalles: DetalleRemito[];
}

// Guardado en localStorage a propósito: esto es un frontend de prueba
// interno, no la versión final. Antes de exponer esto a clientes reales
// conviene revisar el manejo de tokens en el cliente (XSS, httpOnly cookies
// para el refresh token, etc.) -- ver NOTAS.md.
const ACCESS_TOKEN_KEY = 'gestioya_access_token';
const REFRESH_TOKEN_KEY = 'gestioya_refresh_token';
const USUARIO_KEY = 'gestioya_usuario';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getUsuario(): Usuario | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USUARIO_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(accessToken: string, refreshToken: string, usuario: Usuario) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

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

export async function login(email: string, password: string) {
  const data = await request<{
    accessToken: string;
    refreshToken: string;
    usuario: Usuario;
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setSession(data.accessToken, data.refreshToken, data.usuario);
  return data.usuario;
}

export function listEntidades() {
  return request<{ data: Entidad[]; total: number }>('/entidades');
}

export function createEntidad(input: {
  nombre: string;
  documentoTipo?: string;
  documentoNro?: string;
  email?: string;
  telefono?: string;
}) {
  return request<Entidad>('/entidades', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function deleteEntidad(id: string) {
  return request<void>(`/entidades/${id}`, { method: 'DELETE' });
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

export function deleteUnidadMedida(id: string) {
  return request<void>(`/unidades-medida/${id}`, { method: 'DELETE' });
}

export function listProductos() {
  return request<{ data: Producto[]; total: number }>('/productos');
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

export function deleteProducto(id: string) {
  return request<void>(`/productos/${id}`, { method: 'DELETE' });
}

export function listRemitos() {
  return request<{ data: Remito[]; total: number }>('/remitos');
}

export function getRemito(id: string) {
  return request<Remito>(`/remitos/${id}`);
}

export function createRemito(input: {
  tipo: 'E' | 'S';
  entidadId?: string;
  detalles: { productoId: string; cantidad: number; precioUnitario: number }[];
}) {
  return request<Remito>('/remitos', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateRemitoDetalles(
  id: string,
  detalles: { productoId: string; cantidad: number; precioUnitario: number }[],
) {
  return request<Remito>(`/remitos/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ detalles }),
  });
}

export function emitirRemito(id: string) {
  return request<Remito>(`/remitos/${id}/emitir`, { method: 'POST' });
}

export function anularRemito(id: string) {
  return request<Remito>(`/remitos/${id}/anular`, { method: 'POST' });
}
