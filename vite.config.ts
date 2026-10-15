import { defineConfig } from 'vite';
import { rpgjs, tiledMapFolderPlugin } from '@rpgjs/vite';
import startServer from './src/server';
import { compileWorlds } from './scripts/world-data.mjs';
import { editorApi, ignoreEditorFileChange } from './scripts/web-editor-api.mjs';

compileWorlds();

export default defineConfig({
  optimizeDeps: {
    include: ['pixi.js > @xmldom/xmldom']
  },
  plugins: [
    {
      name: 'nobby-local-worlds',
      handleHotUpdate(ctx) {
        if (ignoreEditorFileChange(ctx.file)) return [];
      },
      configureServer(server) {
        server.middlewares.use(editorApi);
        const reload=(file: string)=>{
          if(!file.endsWith('.tmx')&&!file.endsWith('.tx'))return;
          if (ignoreEditorFileChange(file)) return;
          try { compileWorlds(); server.ws.send({type:'full-reload'}); }
          catch(error) { server.ws.send({type:'error',err:{message:String(error),stack:''}}); }
        };
        server.watcher.add(['src/tiled','editor/templates']);
        server.watcher.on('change',reload);server.watcher.on('add',reload);server.watcher.on('unlink',reload);
      }
    },
    tiledMapFolderPlugin({
      sourceFolder: './src/tiled',      // Folder containing your TMX files
      publicPath: '/map',               // Public URL path for maps
      buildOutputPath: 'map'            // Match the runtime Tiled URL prefix
    }),
    ...rpgjs({
      server: startServer
    })
  ], 
});
