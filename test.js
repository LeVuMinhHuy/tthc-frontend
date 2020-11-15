var UserController=require("./utils/usercontroller.js")
var usercontroller=new UserController()
// console.log(usercontroller)
// console.log(usercontroller.listSession)
usercontroller.insertSession("duongcc")
// console.log(usercontroller.listSession)
// console.log(usercontroller.searchSession("vcl"))
// console.log(usercontroller.listSession
console.log(usercontroller.listSession)
searchItem=usercontroller.searchSession("duongcc")
searchItem.getIntent=true
console.log(usercontroller.listSession)
console.log(usercontroller.deleteSession("duongcc"))
console.log(usercontroller.listSession)