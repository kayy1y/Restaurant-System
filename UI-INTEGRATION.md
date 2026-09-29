# Componentes de La Vid

Se integraron Hero02 y SessionNavBar adaptados al POS existente (Vite + React 18). Los componentes nuevos usan TypeScript; no es necesario convertir las vistas JavaScript existentes. Tailwind 3 permanece instalado y sus estilos globales están en `src/index.css`.

`src/components/ui` es la carpeta reutilizable de componentes, accesible mediante `@/components/ui`. `components.json`, `tsconfig.json` y el alias de Vite ya están configurados; no hace falta inicializar otro proyecto con el CLI de shadcn. Separar estos componentes permite reutilizar el diseño sin mezclarlo con permisos, consultas o lógica de pedidos.

Las dependencias están en package.json y package-lock.json. Para otro equipo: `npm install`, `npm run dev`. Verificación: `npx tsc --noEmit` y `npm run build`.

Hero02 recibe el título, descripción, acción de actualización, filtros y contenido real de reportes. DashboardDemo es el cuerpo del dashboard y recibe los datos agregados; no contiene cifras de demostración. SessionNavBar recibe los módulos permitidos, usuario, navegación y cierre de sesión. Las referencias de Next.js se sustituyeron por las rutas y callbacks actuales. Motion se usa desde `motion/react`, sin duplicar Framer Motion.

Los reportes consultan Supabase cuando está configurado; si no, muestran datos locales. Recargan al recibir eventos de pedidos/pagos y consultan cada cinco segundos mientras la pestaña está visible. Los períodos usan la zona horaria de Costa Rica; los cobros se atribuyen al momento del pago. No se mezclan pedidos abiertos con cobros. El gráfico tiene detalle por punto y una tabla accesible.

Andrea se creó mediante la función administrativa del proyecto Supabase conectado y se verificó el acceso. No se necesitan nuevas migraciones para ese proyecto. La pantalla inicial espera la lista real de usuarios activos y no mezcla usuarios de demostración con perfiles remotos.
