/**
 * Shared type definitions for the admin section.
 * Centralised here so AdminPage, section pages, Rail, and Sidebar
 * all import from one place — no more duplicated local type aliases.
 */

export const ADMIN_VIEWS = ['dashboard', 'inventory', 'orders', 'payments', 'reports', 'bopis', 'cms', 'banners', 'categories', 'doku'] as const;
export type AdminView = (typeof ADMIN_VIEWS)[number];

export const PIMPINAN_VIEWS = ['dashboard', 'orders', 'reports'] as const;
export type PimpinanView = (typeof PIMPINAN_VIEWS)[number];
