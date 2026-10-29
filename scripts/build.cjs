const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'public');
if(path.dirname(out)!==root||path.basename(out)!=='public')throw Error('Unsafe output directory');
if(fs.existsSync(out)){if(fs.lstatSync(out).isSymbolicLink()||fs.realpathSync(out)!==out)throw Error('Output directory must not be a link');fs.rmSync(out,{recursive:true});}
fs.mkdirSync(out);
for(const name of fs.readdirSync(root))if(name.endsWith('.html'))fs.copyFileSync(path.join(root,name),path.join(out,name));
for(const name of ['assets','css','js'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
console.log('Public distribution generated: HTML, CSS, JavaScript and assets only.');
