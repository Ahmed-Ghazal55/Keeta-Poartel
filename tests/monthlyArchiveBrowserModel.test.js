const assert=require("assert"), fs=require("fs"), path=require("path");
const html=fs.readFileSync(path.join(__dirname,"..","keeta_operations_portal_starter_v4.html"),"utf8"), js=fs.readFileSync(path.join(__dirname,"..","keeta_operations_portal_archive_extension.js"),"utf8");
assert(html.includes("monthlyArchiveBuilder.js")); assert(html.includes("keeta_operations_portal_archive_extension.js")); ["Archive Overview","Monthly Archive Preview","Archive Runs","Archive Issues","Archive Source Traceability","data-archive-detail","data-read-only=\"true\""].forEach(x=>assert(js.includes(x),x)); assert(!js.includes("auditLog.create")); assert(!js.includes("dataStore.save"));
console.log("monthlyArchiveBrowserModel: 11/11 passed");
