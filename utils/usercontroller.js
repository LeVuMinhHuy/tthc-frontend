module.exports = function(){ 
this.listSession=[];

this.searchSession=function (inUserid){
    // console.log(this.listSession)
    for (let i=0;i<this.listSession.length;i++){
        if (inUserid==this.listSession[i].userId){
            return this.listSession[i]
        }
    }
    return null
}

this.insertSession=function (inUserid){
    newSession={userId:inUserid,
        getInfo:false,
        getIntent:false,
        data:{
            message:null,
            intent:null,
            is_correct:null,
            ask_count:0,
            asw_count:0,
            prev_bot_ask:null
        }
    };
    this.listSession.push(newSession)
    return newSession
}

this.deleteSession=function (inUserid){
    var lengthBefore=this.listSession.length
    this.listSession=this.listSession.filter(item => item.userId!=inUserid)
    if (lengthBefore==this.listSession.length)
        return false
    return true
}

}