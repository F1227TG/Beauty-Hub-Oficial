export function fixedPrices(space){return (space.services||[]).filter(s=>s.pricing_mode==='fixed'&&s.price!==null&&s.price!==undefined&&Number.isFinite(Number(s.price))&&Number(s.price)>=0).map(s=>Number(s.price));}
export function lowestPrice(space){const prices=fixedPrices(space);return prices.length?Math.min(...prices):Infinity;}
export function withinPrice(space,min,max){if((min===''||min==null)&&(max===''||max==null))return true;return fixedPrices(space).some(price=>(min===''||min==null||price>=Number(min))&&(max===''||max==null||price<=Number(max)));}
