import path from 'node:path';

import kleur from 'kleur';

import { runInit } from './init';

export function runCommand(args: string[], cwd: string) {
  const cmd = args[0];

  if (cmd !== 'init') {
    console.log(`Use: ${kleur.cyan('npx xray-analytics init')}`);
    return 1;
  }

  try {
    const result = runInit(cwd);
    const routeLabel = result.routeWrite === 'created' ? 'Created' : 'Already exists';

    console.log(kleur.green(`${routeLabel}: ${path.relative(cwd, result.routePath)}`));
    console.log(kleur.green(`Updated: ${path.relative(cwd, result.envPath)}`));
    console.log('\nDone! Use <AnalyticsProvider transport="bff" /> with endpoint "/api/track".');

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.log(kleur.red(message));
    return 1;
  }
}
