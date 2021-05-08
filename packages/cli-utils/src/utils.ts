export function isFunction(ob:any):Boolean{
  return typeof ob === 'function'
}

export function isArray(ob:any):Boolean{
  return Object.prototype.toString.call(ob) === '[object Array]'
}