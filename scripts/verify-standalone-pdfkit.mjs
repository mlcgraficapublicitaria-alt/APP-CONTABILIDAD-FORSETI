import { execFileSync } from "node:child_process";
execFileSync(process.execPath, ["--input-type=module", "-e", "import PDFDocument from 'pdfkit'; const d=new PDFDocument(); let n=0; d.on('data',x=>n+=x.length); d.on('end',()=>{if(n<512)process.exit(2)}); d.text('FORSETI PDF preflight'); d.end();"], { cwd: ".next/standalone", stdio: "pipe" });
