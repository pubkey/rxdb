const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const GraphQLServer = require('./graphql-server');
const SignalingServer = require('./signaling-server');
const { startRemoteStorageServer } = require('./remote-storage-server');
const {
    blobBufferUtil
} = require('../../');
export function startTestServers() {
    const staticFilesPath = path.join(
        __dirname,
        '../../',
        'docs-src',
        'files'
    );
    console.log('staticFilesPath: ' + staticFilesPath);

    // we need one graphql server so the browser can sync to it
    GraphQLServer.spawn([], 18000);
    SignalingServer.startSignalingServer(18006);
    startRemoteStorageServer(18007);

    /**
     * we need to serve some static files
     * to run tests for attachments
     */
    const fileServerPort = 18001;
    const app = express();
    app.use(cors());
    app.get('/', (_req: any, res: any) => {
        res.send('Hello World!');
    });
    app.use('/files', express.static(staticFilesPath));
    app.get('/base64/:filename', async (req: any, res: any) => {
        const filename = req.params.filename;
        const filePath = path.join(
            staticFilesPath,
            filename
        );
        const buffer = fs.readFileSync(filePath);
        const blob = new Blob([buffer]);
        const base64String = await blobBufferUtil.toBase64String(blob);
        res.set('Content-Type', 'text/html');
        res.send(base64String);
    });
    app.listen(fileServerPort, () => console.log(`Server listening on port: ${fileServerPort}`));
}
