resp = require("../response/response.js");
request = require("request");
sync = require('sync-request');

var UserController = require("../utils/usercontroller.js")
const CONVERSATION_MANAGER_ENDPOINT = "http://127.0.0.1:8080/api/cse-assistant-conversation-manager"


var userController = new UserController();
module.exports = function (controller) {

    var promiseBucket = {
        default: []
    }

    var userMessageCount = {
    }


    var isRating = {};
    var star = {};
    var appropriate = {}; // "khong_phu_hop", "hoi_thieu", "phu_hop", "hoi_du",
    var catched_intents = {}; //arr type
    var edited_intents = {}; // arr type
    var conversation = {}; // arr type
    var previousNonameRound = 0;
    var currentRound = 0;
    var nonameStreak = 0;
    function isEmpty(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key))
                return false;
        }
        return true;
    }

    function conductOnboarding(bot, message) {

        bot.startConversation(message, function (err, convo) {
            var id = message.user
            convo.say({
                text: resp.hello,
            });
            userMessageCount[id] = 0;
        });
    }

    function restartConversation(bot, message) {
        var id = message.user
        if (isRating[id] && message.save) {
            console.log("CALL SAVE API HERE")
            body = {
                star: star[id],
                appropriate: appropriate[id],
                catched_intents: catched_intents[id],
                edited_intents: edited_intents[id],
                conversation: conversation[id]
            }
            console.log(JSON.stringify(body))
            request.post(RATING_CONVERSATION_ENDPOINT, { json: body }, (err, resp, data) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(data);
                }
            })
        }
        isRating[id] = false;
        bot.reply(message, { graph: {}, text: resp.thank });
        var success = userController.deleteSession(id);
        if (!success) {
            console.log("Error in delete function");
        } else {
            console.log("Delete success");
        }

        console.log("id "+ id);
        if (id) {
            conversation[id] = [];
            var delete_body = sync("DELETE", CONVERSATION_MANAGER_ENDPOINT + "?graph_id=" + id);
            console.log("DELETE GRAPH CODE:" + delete_body.statusCode);
        }
        setTimeout(() => {
            bot.reply(message, resp.hello)
            userMessageCount[id] = 0;
            userController.deleteSession(id);
        }, 1000)

    }

    function handleDoneResponse(bot, message, body){
        bot.reply(message, {
                                text: resp.thank,
                                intent: body.agent_action.intent
                            })
    }
    function handleHelloResponse(bot, message, body){
        bot.reply(message, {
            text: body.message,
            isAbleToSuggest: true
        })
    }
    function handleNonameResponse(bot, message, body){
        if (currentRound - previousNonameRound == 1){
            nonameStreak += 1;
        } else {
            nonameStreak = 0;
            
        }
        previousNonameRound = currentRound;
        var text = body.message;
        if (nonameStreak > 2) {
            text = "Có vẻ như có vấn đề với tên hoạt động mà bạn cung cấp. Vui lòng kiểm tra lại chính xác tên hoặc thử hỏi cách khác bạn nhé!";
            nonameStreak = 0;
        }
        bot.reply(message, {
            text: text,
            isAbleToSuggest: true
        })
    }
    function handleMatchfoundResponse(bot, message, body){
        var matchFoundSlot = 'activity';
        var enableResponseToMathfound = null;
        var enableEditInform = null;
        var listResults = null;
        if (body.agent_action.inform_slots[matchFoundSlot] != 'no match available'){
            keyListResults = body.agent_action.inform_slots[matchFoundSlot]
            listResults = body.agent_action.inform_slots[keyListResults]
            enableResponseToMathfound = [
                {
                    title: 'Cảm ơn',
                    payload: {
                        'userResponeToMatchfound': {
                            'acceptMatchfound': true,
                            'userAction': body.agent_action
                        }
                    },
                },
                {
                    title: 'Không thỏa mãn',
                    payload: {
                        'userResponeToMatchfound': {
                            'acceptMatchfound': false,
                            'userAction': body.agent_action
                        }
                    }
                }
            ]
        } else {
            enableEditInform = body.current_informs
        }
        bot.reply(message, {
            text: body.message,
            enableResponseToMathfound: enableResponseToMathfound,
            listResults : listResults,
            enableEditInform: enableEditInform
        });
    }
    function handleInformResponse(bot, message, body){
        var slot = Object.keys(body.agent_action.inform_slots)[0]
        var enableResponseToConfirm = null;
        var enableEditInform = null;
        // handle show current results send from server
        if ('current_results' in body && body.current_results.length > 0 && body.agent_action.round > 2){
            var enableResponseToCurrentResults = [
                {
                    title: 'Đã thỏa mãn',
                    payload: {
                        'userResponeToMatchfound': {
                            'acceptMatchfound': true,
                            'userAction': null
                        }
                    }
                },
                {
                    title: 'Chưa, tiếp tục tư vấn',
                    payload: {
                        'continueToConversation': {
                            'message': body.message,
                            'agent_action': body.agent_action,
                            'current_informs': body.current_informs    
                        }
                        

                    }
                }

            ];
            bot.reply(message, {
                text: 'Đây là thông tin mình tìm được theo yêu cầu hiện tại của bạn',
                listResults: body.current_results,
                enableResponseToCurrentResults: enableResponseToCurrentResults
            });
            return;
        }
        else if (body.agent_action.inform_slots[slot] != 'no match available'){

            if (body.agent_action.inform_slots[slot].length == 0){
                var enableEditInformWhenDenied = null;
                if (body.current_informs != 'null')
                    enableEditInformWhenDenied = body.current_informs;
                enableResponseToConfirm = [
                    
                    {
                        title: 'Đồng ý',
                        payload: {
                            'userResponeToInform': {
                                'anything': true,
                                'userAction': body.agent_action
                            }
                        }
                    },
                    {
                        title: 'Không',
                        payload: {
                            'userResponeToInform': {
                                'acceptInform': false,
                                'enableEditInform': enableEditInformWhenDenied,
                                'userAction': body.agent_action
                            }
                        }
                    }
                ]
            } else {
                
                enableResponseToConfirm = [
                    {
                        title: 'Đồng ý',
                        payload: {
                            'userResponeToInform': {
                                'acceptInform': true,
                                'userAction': body.agent_action
                            }
                        },
                    },
                    {
                        title: 'Sao cũng được',
                        payload: {
                            'userResponeToInform': {
                                'anything': true,
                                'userAction': body.agent_action
                            }
                        }
                    },
                    {
                        title: 'Không',
                        payload: {
                            'userResponeToInform': {
                                'acceptInform': false,
                                'userAction': body.agent_action
                            }
                        }
                    }
                ]
            }
            

            console.log("RESPONSE CONFIRM")
        } else {
            if (body.current_informs != 'null')
                enableEditInform = body.current_informs;
        }
        bot.reply(message, {
            text: body.message,
            enableResponseToConfirm: enableResponseToConfirm,
            enableEditInform : enableEditInform
        });
    }
    function callConversationManager(bot, message) {
        
        var isGetInfor = false;

        var id = message.user;
        var raw_mesg = message.text
        var showCustomButton = false;
        var force_show = false;
        var remove_more = false;
        var filter_attr = false;
        var filter_all = false;
        var isGetIntent = true;

        var user = userController.searchSession(id);
        if (user == null) {
            user = userController.insertSession(id);
        }
        console.log(message);
        if (raw_mesg) {
            if (conversation[message.user]) {
                conversation[message.user].push("user: " + raw_mesg);
            } else {
                conversation[message.user] = ["user: " + raw_mesg];
            }
        }
        // if (message.rating_prop) {
        //     console.log(message.rating_prop)
        //     if (message.rating_prop.star) star[message.user] = message.rating_prop.star;
        //     if (message.rating_prop.appropriate) appropriate[message.user] = message.rating_prop.appropriate;
        //     if (message.rating_prop.catched_intents) edited_intents[message.user] = message.rating_prop.catched_intents;
        //     return;
        // }
        // if (message.continue) {
        //     conversation[message.user].push("bot: "+ resp.whatyourattr );
        //     bot.reply(message, resp.whatyourattr);
        //     return;
        // }
        // if (message.start_rating) {
        //     isRating[message.user] = true;
        //     star[message.user] = -1;
        //     appropriate[message.user] = "phu_hop"; // "khong_phu_hop", "hoi_thieu", "phu_hop", "hoi_du"
        //     catched_intents[message.user] = message.catched_intents;
        //     edited_intents[message.user] = message.catched_intents;
        //     conversation[message.user].push("bot: "+  resp.start_rating );
        //     bot.reply(message, {
        //         text: resp.start_rating,
        //         start_rating: true,
        //         catched_intents: catched_intents[message.user],
        //         force_result: [
        //             {
        //                 title: 'Save',
        //                 payload: {
        //                     'quit': true,
        //                     'save': true
        //                 }
        //             },
        //             {
        //                 title: 'Cancel',
        //                 payload: {
        //                     'quit': true,
        //                     'save': false
        //                 },
        //             },
        //         ]
        //     });
        //     return;
        // }
        if (message.quit) {
            restartConversation(bot, message);
            return;
        }

       

        if (message.completed) {
            bot.reply(message, {
                text: resp.goodbye[Math.floor(Math.random() * resp.goodbye.length)],
                force_result: [
                    {
                        title: 'Bắt đầu hội thoại mới',
                        payload: {
                            'restart_conversation': true
                        }
                    }
                ]
            });
            var success = userController.deleteSession(id);
            if (!success) {
                console.log("Error in delete function");
            } else {
                console.log("Delete success");
            }
            return;
        }
        if (message.restart_conversation) {
            bot.reply(message, {
                text: resp.hello
            });
            return;
        }
        if (!promiseBucket[id]) {
            promiseBucket[id] = []
        }
        var bucket = promiseBucket[id]
        var pLoading = { value: true };
        bucket.push(pLoading)

        

        if (raw_mesg && raw_mesg.length > 0) {
            // console.log("say hi")
            // console.log(isGetInfor);
            // console.log(isGetIntent);
            // if (raw_mesg.trim().toLowerCase() == "bye") {
            //     bot.reply(message, {
            //         text: resp.goodbye[Math.floor(Math.random() * resp.goodbye.length)],
            //         force_result: [
            //             {
            //                 title: 'Bắt đầu hội thoại mới',
            //                 payload: {
            //                     'restart_conversation': true
            //                 }
            //             }
            //         ]
            //     });

            //     var success = userController.deleteSession(id);
            //     if (!success) {
            //         console.log("Error in delete function");
            //     } else {
            //         console.log("Delete success");
            //     }
            //     return;
            // }
            var messageBack = raw_mesg;
            if (message.continueToConversation != undefined && message.continueToConversation != null){
                handleInformResponse(bot, message, message.continueToConversation);
                return;
            }
            if (message.userResponeToInform != null){
                if (message.userResponeToInform.anything){
                    userAction = message.userResponeToInform.userAction;
                    for (var prop in userAction.inform_slots){
                        // if (userAction.inform_slots.hasOwnProperty(prop)){
                        //     userAction.inform_slots.prop = 'anything'
                        // }
                        userAction.inform_slots[prop] = 'anything';
                    }
                    delete userAction.round;
                    delete userAction.speaker;
                    messageBack = userAction;
                }
                else if (message.userResponeToInform.acceptInform){
                    userAction = message.userResponeToInform.userAction;
                    delete userAction.round;
                    delete userAction.speaker;
                    messageBack = userAction;
                } else {
                    var enableEditInform = null;
                    userAction = message.userResponeToInform.userAction;
                    slot = resp.AGENT_INFORM_OBJECT[Object.keys(userAction.inform_slots)[0]];
                    var msg = `Vậy ${slot} là gì bạn?`;
                    if (message.userResponeToInform.enableEditInform != null){
                        enableEditInform = message.userResponeToInform.enableEditInform;
                        msg = `Vậy bạn điều chỉnh lại thông tin giúp mình nhé!`;
                    }
                    
                    bot.reply(message, {
                            text: msg,
                            enableEditInform : enableEditInform
                        });
                    return;
                    
                }
            }
            if (message.userResponeToMatchfound != null){
                if (message.userResponeToMatchfound.acceptMatchfound){
                    messageBack = {intent: "done", inform_slots:{}, request_slots: {}}
                } else {
                    messageBack = {intent: "reject", inform_slots:{}, request_slots: {}}
                }
            }
            if (message.userEditedInformSlot != null){
                userAction = {intent: "inform", request_slots: {}, inform_slots:message.userEditedInformSlot.userInform};
                messageBack = userAction;
            }
            console.log("request action::#########")
            console.log(messageBack)
            request.post(CONVERSATION_MANAGER_ENDPOINT, {
                json: {
                    message: messageBack,
                    state_tracker_id: id
                }
            }, (error, res, body) => {
                intent = null;
                
                if (error || res.statusCode != 200) {
                    console.log(error);
                    bot.reply(message, {
                        text: resp.err
                    });
                    return;
                }
                if (body != null && body.agent_action != null){
                    console.log(body.agent_action)
                    currentRound += 1;
                    switch (body.agent_action.intent){
                        case "inform":
                            handleInformResponse(bot, message, body);
                            break;
                        case "match_found":
                            console.log(body.agent_action.inform_slots[body.agent_action.inform_slots['activity']])

                            handleMatchfoundResponse(bot, message, body);
                            break;
                        case "done":
                            handleDoneResponse(bot, message, body);
                            break;
                        case "hello":
                            handleHelloResponse(bot, message, body);
                            break;
                        case "no_name":
                            handleNonameResponse(bot, message, body);
                            break;
                        default:
                            bot.reply(message, {
                                text: body.message
                            })
                    }

                    return;
                }
                // console.log("agent: " + body)
                // bot.reply(message, {
                //     text: body.message
                // })
               


            });

            // bot.reply(message, {
            //     text: response_body.question,
            //     graph: graph,
            //     force_result: [
            //         {
            //             title: 'Bỏ tiếp yêu cầu',
            //             payload: {
            //                 'remove_more': true
            //             },
            //         },
            //         {
            //             title: 'In luôn kết quả',
            //             payload: {
            //                 'force_show': true
            //             }
            //         }
            //     ]
            // })

        }
    }
    controller.on('hello', conductOnboarding);
    controller.on('message_received', callConversationManager);

}
