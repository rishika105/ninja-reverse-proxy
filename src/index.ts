import { program } from "commander";
import { parseYAMLConfig, validateConfig } from "./config.js";
import os from "node:os"
import { createServer } from "./server.js";


async function main() {
    program.option('--config <path>');
    program.parse();

    const options = program.opts();

    if (options && 'config' in options) {
        const validatedConfig = await validateConfig(await parseYAMLConfig(options.config))
        //automatcially takes the number of cpus to spin no of workers for maximum hardware utilization
        await createServer({ port: validatedConfig.server.listen, workerCount: validatedConfig.server.workers ?? os.cpus().length, config: validatedConfig })
    }
}

main();