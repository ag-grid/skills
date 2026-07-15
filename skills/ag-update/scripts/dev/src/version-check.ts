// Node version guard. This file MUST be kept as the first import of main.ts, and MUST NOT
// import any other file: it has to run before any code that might use Node APIs unsupported
// by old Node versions, so it cannot pull such code in itself.
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 20) {
    process.stderr.write(`ERROR: minimum Node.js 20 version required (current version = ${process.version})\n`);
    process.exit(1);
}

export {};
