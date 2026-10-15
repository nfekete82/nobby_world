import { defineConfig } from 'vite';
import { rpgjs, tiledMapFolderPlugin } from '@rpgjs/vite';
import startServer from './src/server';
import { compileWorlds } from './scripts/world-data.mjs';

compileWorlds();

export default defineConfig({
  optimizeDeps: {
    include: ['pixi.js > @xmldom/xmldom']
  },
  plugins: [
    {
      name: 'nobby-local-worlds',
      configureServer(server) {
        const reload=(file: string)=>{
          if(!file.endsWith('.tmx')&&!file.endsWith('.tx'))return;
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
