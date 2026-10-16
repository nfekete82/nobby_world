import { defineConfig } from 'vite';
import { rpgjs, tiledMapFolderPlugin } from '@rpgjs/vite';
import startServer from './src/server';
import { compileWorlds } from './scripts/world-data.mjs';
import { editorApi, ignoreEditorFileChange, editorIsActive } from './scripts/web-editor-api.mjs';

compileWorlds();

export default defineConfig({
  cacheDir: process.env.NOBBY_EDITOR_FIXTURE ? ".vite-editor-fixture" : "node_modules/.vite",
  optimizeDeps: {
    include: ['pixi.js > @xmldom/xmldom']
  },
  plugins: [
    {
      name: 'nobby-local-worlds',
      // Vite 8's environment-aware hook: do not HMR/reload a TMX while the
      // web editor is awaiting its save response. Keep the compatibility hook
      // for earlier Vite versions and any plugin using the classic pipeline.
      hotUpdate(ctx) {
        if (ignoreEditorFileChange(ctx.file)) return [];
      },
      handleHotUpdate(ctx) {
        if (ignoreEditorFileChange(ctx.file)) return [];
      },
      configureServer(server) {
        // Runtime JSON is data, not server configuration. Vite otherwise restarts
        // before hotUpdate hooks run, dropping in-flight saves and session tokens.
        server.config.configFileDependencies=server.config.configFileDependencies.filter(file=>
          !file.endsWith('/src/art/registry.json')&&!file.endsWith('/src/generated/worlds.json'));
        server.middlewares.use(editorApi);
        // Neither Vite nor framework plugins may reload an open editor and
        // discard its draft. The user's explicit refresh is the publication boundary.
        const send=server.ws.send.bind(server.ws);
        server.ws.send=((...args:any[])=>{
          const event=args[0];
          if(editorIsActive()&&event&&typeof event==='object'&&['full-reload','update'].includes(event.type))return;
          return (send as any)(...args);
        }) as any;
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
