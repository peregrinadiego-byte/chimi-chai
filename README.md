# EZ-APU

Aplicación React/Vite para elaboración de presupuestos, matrices APU, números generadores, estimaciones y control de obra.

## Requisitos

- Node.js 20 o superior
- npm

## Instalación local

```bash
npm install
npm run dev
```

Abrir la dirección que muestre Vite, normalmente `http://localhost:3000`.

## Verificación

```bash
npm run lint
npm run build
```

## Versión de escritorio

```bash
npm run desktop:dev
npm run desktop:build
```

Los instaladores se generan en `release/`; esa carpeta está excluida del repositorio.

## Publicación en GitHub Pages

El proyecto incluye un workflow para GitHub Pages. En GitHub se debe activar Pages con **GitHub Actions** como fuente. El repositorio se llama `chimi-chai`, por lo que Vite utiliza la base `/chimi-chai/`.

## Datos y privacidad

Los datos de la obra se guardan localmente en el navegador mediante `localStorage`. No se deben subir credenciales, archivos `.env`, instaladores ni bases de datos con información sensible.
