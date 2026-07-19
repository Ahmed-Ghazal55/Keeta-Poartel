"use strict";

const fs = require("fs");
const path = require("path");

function ensureDirSync(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
  return directoryPath;
}

function readJsonFile(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  return filePath;
}

function copyFileSync(sourceFilePath, targetFilePath) {
  ensureDirSync(path.dirname(targetFilePath));
  fs.copyFileSync(sourceFilePath, targetFilePath);
  return targetFilePath;
}

module.exports = {
  copyFileSync,
  ensureDirSync,
  readJsonFile,
  writeJsonFile
};
