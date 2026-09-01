#!/usr/bin/env node
import fs from 'node:fs'

const files = {
  package: 'package.json',
  tauri: 'src-tauri/tauri.conf.json',
  cargo: 'src-tauri/Cargo.toml',
}

function packageVersion() {
  const value = JSON.parse(fs.readFileSync(files.package, 'utf8')).version
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`Invalid package version: ${value}`)
  return value
}

function versions() {
  const version = packageVersion()
  const tauri = JSON.parse(fs.readFileSync(files.tauri, 'utf8')).version
  const cargoText = fs.readFileSync(files.cargo, 'utf8')
  const cargo = cargoText.match(/^version\s*=\s*"([^"]+)"/m)?.[1]
  return { version, tauri, cargo, cargoText }
}

function writeJson(file, mutate) {
  const document = JSON.parse(fs.readFileSync(file, 'utf8'))
  mutate(document)
  fs.writeFileSync(file, `${JSON.stringify(document, null, 2)}\n`)
}

function setVersion(next) {
  if (!/^\d+\.\d+\.\d+$/.test(next)) throw new Error('Version must use MAJOR.MINOR.PATCH')
  writeJson(files.package, (document) => { document.version = next })
  writeJson(files.tauri, (document) => { document.version = next })
  const cargo = fs.readFileSync(files.cargo, 'utf8')
  fs.writeFileSync(files.cargo, cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${next}"`))
  console.log(`Version set to ${next}`)
}

function checkVersion() {
  const current = versions()
  if (current.tauri !== current.version || current.cargo !== current.version) {
    throw new Error(`Version mismatch: package=${current.version}, tauri=${current.tauri}, cargo=${current.cargo}`)
  }
  console.log(`Version OK (${current.version})`)
}

const [command, value] = process.argv.slice(2)
if (command === 'set') setVersion(value)
else if (command === 'sync') setVersion(packageVersion())
else if (command === 'check') checkVersion()
else throw new Error('Usage: node scripts/version.mjs <set x.y.z | sync | check>')
