import cluster, { type Worker } from "node:cluster";
import http from "node:http"
import { rootConfigSchema, type ConfigSchemaType } from "./schema/config-schema.js";
import type { WorkerMessageType } from "./schema/server-schema.js";

interface CreateServerConfig {
    port: number;
    workerCount: number;
    config: ConfigSchemaType
}

//spin up workers using cluster
export async function createServer(config: CreateServerConfig) {
    const { workerCount, port } = config;

    //master node -> primary
    if (cluster.isPrimary) {
        console.log("Master process is up 🚀 ")

        for (let i = 0; i < workerCount; i++) {
            //this fork takes an env here config
            cluster.fork({ config: JSON.stringify(config.config) }); //spawn a new worker process
            console.log(`Master process: worker node spinned ${i}`)
        }


        const server = http.createServer(function (req, res) {
            //random index of a worker
            const index = Math.floor(Math.random() * workerCount)
            //workers is not nullable we know so add !
            const worker: Worker = Object.values(!cluster.workers)[index];

            const payload: WorkerMessageType = {
                requestType: 'HTTP',
                headers: req.headers,
                body: null,
                url: `${req.url}`,
            }

            worker.send(JSON.stringify(payload))
        })

        server.listen(config.port, function() {
            console.log(`Reverse proxy listening on PORT ${port}` )
        })
    }
    else {
        console.log('Worker Node 🚀')
        // console.log(process.env.config)
        const config = await rootConfigSchema.parseAsync(JSON.parse(`${process.env.config}`));

        process.on('message', (message) => {
            console.log(message)
        })
    }
}
