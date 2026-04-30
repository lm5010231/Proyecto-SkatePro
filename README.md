# Sistema de Gestion de Escuela de Patinaje

Proyecto movil en React Native (Expo) con backend Supabase (PostgreSQL, Auth, Storage y Realtime).

## Tecnologias

- Frontend movil: React Native
- Backend BaaS: Supabase

## Ejecutar

```bash
cd mobile
npm install
npm start
```

## Configurar Supabase

1. Crea `mobile/.env` con:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. En Supabase SQL Editor, ejecuta `mobile/supabase-schema.sql`.
3. En `Authentication > Providers`, habilita `Email`.
4. En `Storage`, crea el bucket para galeria multimedia (si vas a subir archivos).

## Modulos implementados

- Registro de aspirantes con React Native + Supabase Auth
- Gestion de alumnos (perfil, pagos, clases en tiempo real)
- Gestion de instructores (CRUD, rol admin)
- Gestion de clases (programacion, instructor y alumnos por clase)
- Gestion de pagos (registro, estado pendiente/pagado y reporte)
- Registro de asistencia (por clase y reporte por alumno)
- Divulgacion institucional (mision, vision, valores, noticias, testimonios y galeria)

## Modelo de datos

Tablas principales en Supabase:

- `usuarios`
- `instructores`
- `clases`
- `clase_alumnos`
- `pagos`
- `asistencia`
- `testimonios`
- `noticias`
- `galeria`
- `informacion_institucional`
