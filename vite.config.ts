import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/advice' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', async () => {
              try {
                // Attach body object for the handler
                (req as any).body = JSON.parse(body);
              } catch (e) {
                (req as any).body = {};
              }
              try {
                // Use Vite's SSR module loader to load the TypeScript API file
                const handlerModule = await server.ssrLoadModule('/api/advice.ts');
                const handler = handlerModule.default;
                
                // Mock res.status and res.json which Vercel provides
                const mockRes = res as any;
                mockRes.status = (code: number) => {
                  mockRes.statusCode = code;
                  return mockRes;
                };
                mockRes.json = (data: any) => {
                  mockRes.setHeader('Content-Type', 'application/json');
                  mockRes.end(JSON.stringify(data));
                };
                
                await handler(req, mockRes);
              } catch (e) {
                console.error('API Error:', e);
                res.statusCode = 500;
                res.end('Internal Server Error');
              }
            });
          } else {
            next();
          }
        });
      }
    }
  ],
})
