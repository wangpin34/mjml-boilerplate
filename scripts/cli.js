#!/usr/bin/env node
const yargs = require('yargs')
const fsModule = require('fs')
const path = require('path')
const mustache = require('mustache')

const fs = fsModule.promises
const constants = fsModule.constants

let _root
async function walk(dir = __dirname) {
  if (_root) {
    return _root
  }
  await undefined
  try {
    await fs.access(path.join(dir, 'package.json'), constants.R_OK)
    _root = dir
    return _root
  } catch (err) {
    // ignore error
    return await walk(path.join(__dirname, '..'))
  }
}

async function getRoot() {
  return await walk()
}

const template = `
import { registerDependencies } from 'mjml-validator'
import { BodyComponent } from 'mjml-core'

registerDependencies({
  // Tell the validator which tags are allowed as our component's parent
  'mj-body': ['{{tag}}'],
  // Tell the validator which tags are allowed as our component's children
  '{{tag}}': [],
})

export default class {{name}} extends BodyComponent {
  // Tell the parser that our component won't contain other mjml tags
  static endingTag = true

  // Tells the validator which attributes are allowed for mj-layout
  static allowedAttributes = {
  }

  // What the name suggests. Fallback value for this.getAttribute('attribute-name').
  static defaultAttributes = {
  }

  render() {
    // return something
  }
}
`

function toKobeCase(str) {
  return /[a-z]+/g.test(str) ? str : [...str.matchAll(/[A-Z]+[a-z]*/g)].map((match) => match[0].toLowerCase()).join('-')
}

function isValidName(name) {
  return /^[A-Za-z]+$/g.test(name)
}

yargs
  .command(
    'component',
    'create a component',
    {
      name: {
        alias: 'n',
        default: 'new-component',
      },
    },
    function (argv) {
      const _name = argv.name
      if (!isValidName(_name)) {
        console.error(`Only english letters are allowed in component name`)
        return
      }
      const tag = `mj-${toKobeCase(_name)}`
      const name = `${tag
        .split('-')
        .map((item) => `${item.charAt(0).toUpperCase()}${item.substr(1)}`)
        .join('')}`
      getRoot()
        .then((root) => {
          process.chdir(root)
          const file = path.join(root, `./components/${name}.js`)
          return fs.writeFile(file, mustache.render(template, { tag, name }), 'utf8').then(() => file)
        })
        .then((file) => {
          console.log(`Created component at ${file}`)
        })
    }
  )
  .command(
    'shared',
    'create a shard snippts which could be loaded using <mj-include/>',
    {
      name: {
        alias: 'n',
        default: 'new-segment',
      },
    },
    function (argv) {
      const _name = argv.name
      if (!isValidName(_name)) {
        console.error(`Only english letters are allowed in shard snippts name`)
        return
      }
      const name = _name
      getRoot()
        .then((root) => {
          process.chdir(root)
          const file = path.join(root, `./shared/${name}.mjml`)
          return fs.writeFile(file, ``, 'utf8').then(() => file)
        })
        .then((file) => {
          console.log(`Created shared at ${file}`)
        })
    }
  )
  .command(
    'template',
    'create a template',
    {
      name: {
        alias: 'n',
        default: 'new-template',
      },
    },
    function (argv) {
      const _name = argv.name
      if (!isValidName(_name)) {
        console.error(`Only english letters are allowed in template name`)
        return
      }
      const name = _name
      getRoot()
        .then((root) => {
          process.chdir(root)
          const file = path.join(root, `./templates/${name}.mjml`)
          return fs.writeFile(file, ``, 'utf8').then(() => file)
        })
        .then((file) => {
          console.log(`Created template at ${file}`)
        })
    }
  )
  .help().argv
