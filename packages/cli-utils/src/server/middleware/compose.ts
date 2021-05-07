
export function compose(middlewares: Array<Function> = []){
  return function(){
    middlewares.forEach((middleware:Function) => {
      middleware.call(null)
    })
  }
}