const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('quote prices never become a zero-price offer or pass a fixed-price filter',async()=>{
 const source=fs.readFileSync(path.join(__dirname,'../js/explore-pricing.js'),'utf8');const {lowestPrice,withinPrice}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const quote={services:[{pricing_mode:'quote',price:0}]},mixed={services:[{pricing_mode:'quote',price:0},{pricing_mode:'fixed',price:80},{pricing_mode:'fixed',price:120}]};
 assert.equal(lowestPrice(quote),Infinity);assert.equal(withinPrice(quote,'',''),true);assert.equal(withinPrice(quote,'0','100'),false);
 assert.equal(lowestPrice(mixed),80);assert.equal(withinPrice(mixed,'80','90'),true);assert.equal(withinPrice(mixed,'90','100'),false);
 assert.equal(lowestPrice({services:[{pricing_mode:'fixed',price:null}]}),Infinity);assert.equal(lowestPrice({services:[{pricing_mode:'fixed',price:0}]}),0);
});
