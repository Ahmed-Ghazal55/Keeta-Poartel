"use strict";

const path = require("path");
const entitySchemas = require("../src/data/entitySchemas.js");
const { copyFileSync, ensureDirSync, readJsonFile, writeJsonFile } = require("./fileUtils.js");

function createLocalDb(options) {
  const dataDir = options && options.dataDir
    ? options.dataDir
    : path.join(__dirname, "..", "data", "local-db");
  const backupRoot = options && options.backupRoot
    ? options.backupRoot
    : path.join(__dirname, "..", "data", "backups");

  ensureDirSync(dataDir);
  ensureDirSync(backupRoot);

  function collectionFile(entityName) {
    validateEntity(entityName);
    return path.join(dataDir, entityName + ".json");
  }

  function validateEntity(entityName) {
    if (!entitySchemas.hasEntitySchema(entityName)) {
      throw new Error("Invalid entity: " + entityName);
    }
  }

  function readCollection(entityName) {
    const filePath = collectionFile(entityName);
    const fallback = [];
    const records = readJsonFile(filePath, fallback);
    if (!Array.isArray(records)) {
      throw new Error("Collection file must contain an array: " + entityName);
    }
    return records;
  }

  function writeCollection(entityName, records) {
    const filePath = collectionFile(entityName);
    return writeJsonFile(filePath, Array.isArray(records) ? records : []);
  }

  function insert(entityName, record) {
    const records = readCollection(entityName);
    records.push(record);
    writeCollection(entityName, records);
    return record;
  }

  function upsert(entityName, id, record) {
    const schema = entitySchemas.getEntitySchema(entityName);
    const records = readCollection(entityName);
    const targetId = id || (record && record[schema.idField]);
    const index = records.findIndex((item) => String(item[schema.idField]) === String(targetId));
    if (index >= 0) {
      records[index] = Object.assign({}, records[index], record);
    } else {
      records.push(Object.assign({}, record, { [schema.idField]: targetId || record.id }));
    }
    writeCollection(entityName, records);
    return records[index >= 0 ? index : records.length - 1];
  }

  function remove(entityName, id) {
    const schema = entitySchemas.getEntitySchema(entityName);
    const records = readCollection(entityName).filter((item) => String(item[schema.idField]) !== String(id));
    writeCollection(entityName, records);
    return records;
  }

  function query(entityName, filters) {
    return readCollection(entityName).filter((record) => {
      return Object.keys(filters || {}).every((key) => {
        const expected = filters[key];
        if (expected == null || expected === "") {
          return true;
        }
        if (Array.isArray(expected)) {
          return expected.indexOf(record[key]) >= 0;
        }
        return String(record[key] == null ? "" : record[key]).toLowerCase() === String(expected).toLowerCase();
      });
    });
  }

  function backup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const targetDir = ensureDirSync(path.join(backupRoot, timestamp));
    entitySchemas.listEntityNames().forEach((entityName) => {
      const sourceFilePath = collectionFile(entityName);
      if (!require("fs").existsSync(sourceFilePath)) {
        writeCollection(entityName, []);
      }
      copyFileSync(sourceFilePath, path.join(targetDir, entityName + ".json"));
    });
    return targetDir;
  }

  return {
    backup,
    dataDir,
    insert,
    query,
    readCollection,
    remove,
    upsert,
    validateEntity,
    writeCollection
  };
}

module.exports = {
  createLocalDb
};
