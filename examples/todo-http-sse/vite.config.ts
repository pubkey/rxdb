import { defineConfig } from 'vite';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

/**
 * The client calls /api/... on its own origin and Vite forwards
 * these requests to the Node.js sync server.
 * This works for the Server-Sent Events stream as well.
 */
const proxy = {
    '/api': {
        target: SERVER_URL,
        changeOrigin: true
    }
};

export default defineConfig({
    server: { proxy },
    preview: { proxy }
});
