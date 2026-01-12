import cluster, { type Worker } from "node:cluster";
import http from "node:http"
import { rootConfigSchema, type ConfigSchemaType } from "./schema/config-schema.js";
import type { WorkerMessageType, WorkerMessageReplyType } from "./schema/server-schema.js";
import { workerMessageSchema } from "./schema/server-schema.js"

interface CreateServerConfig {
    port: number;
    workerCount: number;
    config: ConfigSchemaType
}

//spin up workers using cluster
export async function createServer(config: CreateServerConfig) {
    const { workerCount, port } = config;

    const WORKER_POOL: Worker[] = [];


    //master node -> primary
    if (cluster.isPrimary) {
        console.log("Master process is up 🚀 ")

        for (let i = 0; i < workerCount; i++) {
            //this fork takes an env here config
            const w = cluster.fork({ config: JSON.stringify(config.config) }); //spawn a new worker process
            WORKER_POOL.push(w)
            console.log(`Master process: worker node spinned ${i}`)
        }


        const server = http.createServer(function (req, res) {
            //random index of a worker
            const index = Math.floor(Math.random() * WORKER_POOL.length)
            //workers is not nullable we know so add !
            const worker = WORKER_POOL.at(index);

            if (!worker) throw new Error('Worker not found')

            const payload: WorkerMessageType = {
                requestType: 'HTTP',
                headers: req.headers,
                body: null,
                url: `${req.url}`,
            }

            worker.send(JSON.stringify(payload))
        })

        server.listen(config.port, function () {
            console.log(`Reverse proxy listening on PORT ${port}`)
        })
    }
    else {
        console.log('Worker Node 🚀')
        // console.log(process.env.config)
        const config = await rootConfigSchema.parseAsync(JSON.parse(`${process.env.config}`));

        process.on('message', async (message: string) => {
            const messageValidated = await workerMessageSchema.parseAsync(JSON.parse(message))

            const requestURL = messageValidated.url
            const rule = config.server.rules.filter(e => e.path === requestURL)

            if (!rule) {
                const reply: WorkerMessageReplyType = {
                    errorCode: '500',
                    error: 'Rule not found'
                }

                if (process.send) return process.send(JSON.stringify(reply));
            }


            const upstreamID = rule?.upstreams[0];
            const upstream = config.server.upstreams.find(e => e.id === upstreamID)

            if (!upstream) {
                const reply: WorkerMessageReplyType = {
                    errorCode: '500',
                    error: 'Upstream not found'
                }

                if (process.send) return process.send(JSON.stringify(reply));
            }

            http.request({host: upstream?.url, path: requestURL})








            console.log('WORKER', message)
        })
    }
}
