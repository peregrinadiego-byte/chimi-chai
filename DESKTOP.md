# Aplicación de escritorio

EZ-APU Studio usa Electron para reutilizar la misma aplicación React en una ventana autónoma.

## Desarrollo local

```bash
npm install
npm install --save-dev electron electron-builder
npm run desktop:dev
```

## Construcción local

```bash
npm run desktop:build -- --linux AppImage deb
```

En Windows se usa:

```powershell
npm run desktop:build -- --win nsis
```

## GitHub Actions

El workflow `.github/workflows/desktop.yml` genera automáticamente instaladores para Linux y Windows cuando se ejecuta manualmente o cuando se crea una etiqueta `v*`. Los archivos quedan disponibles como artefactos descargables en la ejecución de Actions.

Los datos de proyectos se conservan mediante el almacenamiento local del perfil de la aplicación. Los respaldos JSON permiten mover proyectos entre la versión web y la versión de escritorio.
