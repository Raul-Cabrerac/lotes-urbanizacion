/**
 * Pantallas de la aplicación con sesión: la ruta, el permiso que exige y, si figura en el menú,
 * el texto del enlace y su data-testid. App.tsx arma las rutas y Layout el menú con esta tabla.
 *
 * Cada pantalla exige el permiso de lo que muestra y opera, no el de su nombre en el menú
 * (docs/DECISIONES.md §15).
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
  // El mapa muestra y opera los lotes del proyecto: exige ver lotes.
  { ruta: '/proyectos/:id', permiso: 'lotes:ver', Pagina: ProyectoMapa },
  { ruta: '/clientes', permiso: 'clientes:ver', Pagina: Clientes, menu: { texto: 'Clientes', testid: 'menu-clientes' } },
  { ruta: '/clientes/:id', permiso: 'clientes:ver', Pagina: ClienteDetalle },
  { ruta: '/reservas', permiso: 'reservas:ver', Pagina: Reservas, menu: { texto: 'Reservas', testid: 'menu-reservas' } },
  // La lista de ventas es la mesa de trabajo de quien vende y cobra. El cliente también puede ver
  // ventas, pero solo las suyas, y las ve en su portal; por eso abre el detalle y no esta lista.
  { ruta: '/ventas', permiso: 'ventas:registrar', Pagina: Ventas, menu: { texto: 'Ventas y pagos', testid: 'menu-ventas' } },
  { ruta: '/ventas/:id', permiso: 'ventas:ver', Pagina: VentaDetalle },
  { ruta: '/reportes', permiso: 'reportes:ver', Pagina: Reportes, menu: { texto: 'Reportes', testid: 'menu-reportes' } },
  { ruta: '/usuarios', permiso: 'usuarios:gestionar', Pagina: Usuarios, menu: { texto: 'Usuarios', testid: 'menu-usuarios' } },
  { ruta: '/mi-portal', permiso: 'portal:ver', Pagina: MiPortal, menu: { texto: 'Mis lotes', testid: 'menu-mi-portal' } },
];
