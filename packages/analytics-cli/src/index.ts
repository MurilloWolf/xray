#!/usr/bin/env node
import process from 'node:process';
import { runCommand } from './cli';

const code = runCommand(process.argv.slice(2), process.cwd());
process.exit(code);
