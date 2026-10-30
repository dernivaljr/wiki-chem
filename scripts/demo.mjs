import { spawn, spawnSync } from 'node:child_process'
import { randomBytes, createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, realpath } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), project = 'wikichem-academic-demo'
const directory = join(tmpdir(), 'wikichem-demo-' + createHash('sha256').update(root).digest('hex').slice(0, 16)), envFile = join(directory, 'runtime.env')
const action = process.argv[2], allowed = ['prepare','up','down','reset','access','backup','restore','status','diagnose']
const args = ['compose', '--project-name', project, '--env-file', envFile, '-f', join(root, 'demo/compose.yaml')]
async function run(parts, { input, output, quiet = false, tty = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [...args, ...parts], { cwd: root, shell: false, stdio: tty ? 'inherit' : [input ? 'pipe' : 'ignore', output ? 'pipe' : quiet ? 'ignore' : 'inherit', quiet ? 'ignore' : 'inherit'] })
    child.on('error', reject)
    const stream = output ? createWriteStream(output, { mode: 0o600, flags: 'wx' }) : null
    if (input) { const reader = createReadStream(input); reader.on('error', () => child.kill()); reader.pipe(child.stdin) }
    if (stream) { stream.on('error', () => child.kill()); child.stdout.pipe(stream) }
    child.on('close', code => {
      if (code !== 0) reject(new Error('DEMO_COMMAND_FAILED'))
      else if (stream) { if (stream.writableFinished) resolve(); else stream.once('finish', resolve) }
      else resolve()
    })
  })
}
try {
  if (!allowed.includes(action) || (action !== 'restore' && process.argv.length > (action === 'reset' ? 4 : 3))) throw new Error('DEMO_ARGUMENTS_INVALID')
  if (spawnSync('docker', ['compose', 'version'], { stdio: 'ignore', shell: false }).status !== 0) throw new Error('DOCKER_COMPOSE_REQUIRED')
  await mkdir(directory, { recursive: true, mode: 0o700 })
  let available = true
  try { await readFile(envFile) } catch { available = false }
  if (!available) {
    if (action !== 'prepare') throw new Error('DEMO_PREPARE_REQUIRED')
    const existing = spawnSync('docker', ['volume', 'inspect', project + '_demo-mysql'], { stdio: 'ignore', shell: false })
    if (existing.status === 0) throw new Error('DEMO_RUNTIME_MISSING_EXISTING_VOLUME')
    await writeFile(envFile, 'DEMO_ROOT_PASSWORD=' + randomBytes(32).toString('hex') + '\nDEMO_APP_PASSWORD=' + randomBytes(32).toString('hex') + '\n', { mode: 0o600, flag: 'wx' })
  }
  if (action === 'prepare' || action === 'up') {
    await run(['up', '-d', '--wait', 'mysql'])
    await run(['run', '--build', '--rm', '-T', 'prepare'])
    await run(['up', '-d', '--build', '--wait', 'api', 'frontend'])
    console.log('Demonstração isolada: http://127.0.0.1:4180 — material sintético de teste, sem validade analítica/comercial. Segredos de infraestrutura fora do repositório: ' + directory)
  } else if (action === 'down') await run(['down'])
  else if (action === 'status') await run(['ps'])
  else if (action === 'diagnose') {
    // Somente serviços deste projeto; sanitizar antes de escrever qualquer log.
    const secrets = (await readFile(envFile, 'utf8')).split('\n').map(line => line.slice(line.indexOf('=') + 1)).filter(Boolean)
    const child = spawnSync('docker', [...args, 'logs', '--no-color', '--tail', '100', 'mysql', 'api', 'frontend'], { cwd: root, shell: false, encoding: 'utf8', maxBuffer: 1000000 })
    let text = (child.stdout ?? '') + (child.stderr ?? '')
    for (const secret of secrets) text = text.replaceAll(secret, '[REDACTED]')
    console.log(text)
  }
  else if (action === 'reset') {
    if (process.argv[3] !== '--confirm-demo-reset') throw new Error('EXPLICIT_DEMO_RESET_REQUIRED')
    await run(['down', '--volumes', '--remove-orphans'])
    console.log('Somente os volumes do projeto ' + project + ' foram removidos. Execute demo:prepare para recriar.')
  } else if (action === 'access') {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('DEMO_TTY_REQUIRED')
    await run(['run', '--rm', 'prepare', 'node', 'node_modules/tsx/dist/cli.mjs', 'tests/demo/access.ts'], { tty: true })
  } else if (action === 'backup') {
    const file = join(directory, 'backup-' + Date.now() + '.sql')
    await run(['exec', '-T', 'mysql', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --set-gtid-purged=OFF --no-tablespaces --routines --triggers wikichem_test_demo'], { output: file, quiet: true })
    const hash = createHash('sha256').update(await readFile(file)).digest('hex')
    await writeFile(file + '.json', JSON.stringify({ project, database: 'wikichem_test_demo', sha256: hash }), { mode: 0o600 })
    console.log('Backup restrito à demonstração, fora do repositório: ' + file)
  } else if (action === 'restore') {
    if (process.argv.length !== 4) throw new Error('DEMO_RESTORE_ARGUMENT_REQUIRED')
    const file = await realpath(process.argv[3])
    if (dirname(file) !== await realpath(directory) || !/^backup-\d+\.sql$/.test(file.split(/[\\/]/).pop())) throw new Error('DEMO_BACKUP_PATH_INVALID')
    const meta = JSON.parse(await readFile(file + '.json', 'utf8')), hash = createHash('sha256').update(await readFile(file)).digest('hex')
    if (meta.project !== project || meta.database !== 'wikichem_test_demo' || meta.sha256 !== hash) throw new Error('DEMO_BACKUP_INVALID')
    await run(['stop', 'api', 'frontend'])
    await run(['exec', '-T', 'mysql', 'sh', '-c', 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot wikichem_test_demo'], { input: file, quiet: true })
    await run(['up', '-d', '--wait', 'api', 'frontend'])
    console.log('Backup da demonstração restaurado e serviços iniciados. Não se trata de validação de recuperação de produção.')
  }
} catch (error) {
  console.error('Demonstração não concluída: ' + (error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : 'DEMO_OPERATION_FAILED') + '. Consulte docs/desenvolvimento/DEMONSTRACAO-LOCAL.md. Nenhum ambiente de produção é alvo deste comando.')
  process.exitCode = 1
}
