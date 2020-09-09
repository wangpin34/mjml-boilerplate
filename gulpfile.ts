import mjml2html from 'mjml'
import md5 from 'md5'
import path from 'path'
import { promises as fs } from 'fs'
import babel from 'gulp-babel'
import log from 'fancy-log'
import * as gulp from 'gulp'
//@ts-ignore
import browserSync from 'browser-sync'
//@ts-ignore
import { registerComponent } from 'mjml-core'

const ENCODE = 'utf8'
const SOURCE = path.resolve(__dirname, 'templates')
const TARGET = path.resolve(__dirname, 'build')

async function walkSync(dir: string, filelist: string[] = []) {
  log.info(`watch in dir(${dir})`)
  const files = await fs.readdir(dir)
  log.info(`files ${files} in dir(${dir})`)
  await Promise.all(files.map(async file => {
    const stat = await fs.stat(path.join(dir, file))

    if (stat.isDirectory()) {
      filelist = await walkSync(path.join(dir, file), filelist)
    } else {
      filelist = filelist.concat(path.join(dir, file))
    }
  }))
  log.info(filelist)
  return filelist
}

async function initialize() {
  try {
    await fs.mkdir(TARGET, { recursive: true })
  } catch (err) {
    console.error(err)
  }
}

async function clean() {
  try {
    const files = await walkSync(TARGET)
    files ? await Promise.all(files?.map(async file => await fs.unlink(file))) : await undefined
  } catch (err) {
    throw err
  }
}

async function buildFile(source: string, target: string) {
  const options = {
    beautify: true,
    minify: true,
    filePath: path.normalize('./shared')
  }
  try {
    log.info(`Start to build ${source} to ${target}`)
    const text = await fs.readFile(source, ENCODE)
    const parseResults = mjml2html(text, options)
    if (parseResults.errors && parseResults.errors.length) {
      throw parseResults.errors
    }
    await fs.writeFile(target, parseResults.html)
  } catch (err) {
    log.error(`Failed to build from ${source} or write to ${target}`)
    throw err
  }
}

export async function testwalk() {
  await walkSync(path.resolve(__dirname, './components'))
}

async function compile() {
  return gulp
    .src(path.normalize('components/**/*.js'))
    .pipe(babel({
      presets: ['@babel/preset-env'],
    }))
    .on('error', log)
    .pipe(gulp.dest('lib'))
    .on('end', async () => {
      const watchedComponents = await walkSync(path.resolve(__dirname, './components'))
      const cwd = __dirname
      watchedComponents.filter(file => path.basename(file).indexOf('Mj') > -1).forEach(compPath => {
        const fullPath = compPath.replace(/components/, `lib${path.sep}components`)
        log.info(fullPath)
        process.chdir(path.dirname(fullPath))
        delete require.cache[fullPath]
        registerComponent(require(fullPath).default)
      })

      process.chdir(cwd)

      const templates = await walkSync(SOURCE)
      log.info(`Detected templates ${templates}`)
      await Promise.all(templates.map(async template => {
        await buildFile(template, path.join(__dirname, './build', path.parse(template).name + '.html'))
      })).catch(err => {
        log.error(JSON.stringify(err))
        throw err
      })
    })
}


export const build = gulp.series(initialize, clean, compile)

// Static server
const server = browserSync.create()
function devServer() {
  server.init({
    server: {
      baseDir: path.normalize('./build')
    },
    files: ['build/**']
  })
}

async function watch() {
  await compile()
  return gulp.watch(['templates/*', 'components/*', 'lib/*', 'shared/*'], compile)
}

export const dev =
  gulp.parallel(watch, devServer)


