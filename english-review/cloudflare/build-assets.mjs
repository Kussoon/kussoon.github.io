import {mkdir,copyFile} from "node:fs/promises";
await mkdir(new URL("./public/",import.meta.url),{recursive:true});
for(const name of ["preview.html","local-sync.mjs","import-plan.mjs","migration.mjs"])await copyFile(new URL("./"+name,import.meta.url),new URL("./public/"+(name==="preview.html"?"index.html":name),import.meta.url));
