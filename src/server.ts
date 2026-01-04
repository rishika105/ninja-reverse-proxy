import cluster, { type Worker } from "node:cluster";
import http from "node:http"
import { rootConfigSchema, type ConfigSchemaType } from "./config-schema.js";

interface CreateServerConfig {
    port: number;
    workerCount: number;
    config: ConfigSchemaType
}

//spin up workers using cluster
export async function createServer(config: CreateServerConfig) {
    const { workerCount } = config;

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
            const worker: Worker = Object.values(cluster.workers!)[index];
            
        })
    }
    else {
        console.log('Worker Node 🚀')
        // console.log(process.env.config)
        const config = await rootConfigSchema.parseAsync(JSON.parse(`${process.env.config}`));
    }
}
