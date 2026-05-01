#!/usr/bin/env node
// Production launcher: starts the built Express server (which already wires
// the 5 crons via startCrons() in server/_core/index.ts) with AUTO_GEN_ENABLED on.
import { spawn } from 'child_process';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.AUTO_GEN_ENABLED = process.env.AUTO_GEN_ENABLED || 'true';

const child = spawn('node', ['dist/index.js'], { stdio: 'inherit', env: process.env });
child.on('exit', code => process.exit(code || 0));
