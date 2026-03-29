const { spawnSync } = require('child_process');

const RECOVERY_ENV = 'PRISMA_RECOVER_REPORT_OUTPUT_LOCALE_MIGRATION';
const TARGET_MIGRATION = '20260329130000_add_project_report_output_locale';
const shouldRecover =
  (process.env[RECOVERY_ENV] || '').toLowerCase() === 'true';
const shouldSeed = process.argv.includes('--seed');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status || 1);
  }

  return result;
}

function main() {
  if (shouldRecover) {
    console.log(
      `[startup] ${RECOVERY_ENV}=true, attempting one-time recovery for ${TARGET_MIGRATION} before migrate deploy.`,
    );

    const recovery = run(
      'npx',
      ['prisma', 'migrate', 'resolve', '--rolled-back', TARGET_MIGRATION],
      { allowFailure: true },
    );

    if (recovery.status !== 0) {
      console.log(
        '[startup] Recovery step did not complete cleanly. Continuing to migrate deploy in case the migration was already resolved.',
      );
    }
  }

  run('npx', ['prisma', 'migrate', 'deploy']);
  run('npm', ['run', 'pdf:check']);

  if (shouldSeed) {
    run('npx', ['prisma', 'db', 'seed']);
  }

  run('node', ['dist/main']);
}

main();
