/**
 * Pantallas de la aplicación con sesión: la ruta, el permiso que exige y, si figura en el menú,
 * el texto del enlace y su data-testid. App.tsx arma las rutas y Layout el menú con esta tabla.
 *
 * Los permisos son los de siempre; dos se preguntaron al grupo y siguen abiertos: /ventas exige
 * 'ventas:registrar' y /proyectos/:id exige 'lotes:ver'.
 */
import type { ComponentType } from 'react';
import type { Permiso } from './dominio';
import { ClienteDetalle } from './paginas/ClienteDetalle';
import { Clientes } from './paginas/Clientes';
import { MiPortal } from './paginas/MiPortal';
import { ProyectoMapa } from './paginas/mapa/ProyectoMapa';
import { Proyectos } from './paginas/Proyectos';
import { Reportes } from './paginas/Reportes';
import { Reservas } from './paginas/Reservas';
import { Usuarios } from './paginas/Usuarios';
import { VentaDetalle } from './paginas/VentaDetalle';
import { Ventas } from './paginas/Ventas';

export interface Pantalla {
  ruta: string;
  permiso: Permiso;
  Pagina: ComponentType;
  /** Enlace del menú, en el orden de esta tabla. */
  menu?: { texto: string; testid: string };
}

export const PANTALLAS: Pantalla[] = [
  { ruta: '/proyectos', permiso: 'proyectos:ver', Pagina: Proyectos, menu: { texto: 'Proyectos y mapa', testid: 'menu-proyectos' } },
  { ruta: '/proyectos/:id', permiso: 'lotes:ver', Pagina: ProyectoMapa },
  { ruta: '/clientes', permiso: 'clientes:ver', Pagina: Clientes, menu: { texto: 'Clientes', testid: 'menu-clientes' } },
  { ruta: '/clientes/:id', permiso: 'clientes:ver', Pagina: ClienteDetalle },
  { ruta: '/reservas', permiso: 'reservas:ver', Pagina: Reservas, menu: { texto: 'Reservas', testid: 'menu-reservas' } },
  { ruta: '/ventas', permiso: 'ventas:registrar', Pagina: Ventas, menu: { texto: 'Ventas y pagos', testid: 'menu-ventas' } },
  { ruta: '/ventas/:id', permiso: 'ventas:ver', Pagina: VentaDetalle },
  { ruta: '/reportes', permiso: 'reportes:ver', Pagina: Reportes, menu: { texto: 'Reportes', testid: 'menu-reportes' } },
  { ruta: '/usuarios', permiso: 'usuarios:gestionar', Pagina: Usuarios, menu: { texto: 'Usuarios', testid: 'menu-usuarios' } },
  { ruta: '/mi-portal', permiso: 'portal:ver', Pagina: MiPortal, menu: { texto: 'Mis lotes', testid: 'menu-mi-portal' } },
];
