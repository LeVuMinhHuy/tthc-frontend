// import {animateTyping} from "./typing_indicator.js";
var converter = new showdown.Converter();
converter.setOption('openLinksInNewWindow', true);



const RESULT_MESSAGE_WIDTH_TRANS = 310;
const RESULT_SUB_TABLE_WIDTH_TRANS = 280;

const price_formatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'VND'
})


const AGENT_INFORM_OBJECT = {
  "name_activity": "tên hoạt động",
  "type_activity": "loại hoạt động",
  "holder": "ban tổ chức",
  "time": "thời gian",
  "address": "địa chỉ",
  "name_place": "tên địa điểm",
  "works": "các công việc trong hoạt động",
  "reward": "lợi ích",
  "contact": "liên hệ",
  "register": "đăng ký",
  "joiner": "đối tượng tham gia",
  "activity": "hoạt động"
}
const AGENT_INFORM_SUB_OBJECT = {
  
  "name_place": "tên địa điểm",
  "works": "công việc",
  "time": "thời gian",
  "address": "địa chỉ"
}
const MAX_ATTR = 5;

var Botkit = {
  config: {
    ws_url: (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host,
    reconnect_timeout: 3000,
    max_reconnect: 5
  },
  options: {
    sound: false,
    use_sockets: true
  },
  reconnect_count: 0,
  slider_message_count: 0,
  list_attr_count: 0,
  list_intent_count: 0,
  rating_count: 0,
  guid: null,
  current_user: null,
  on: function (event, handler) {
    this.message_window.addEventListener(event, function (evt) {
      handler(evt.detail);
    });
  },
  trigger: function (event, details) {
    var event = new CustomEvent(event, {
      detail: details
    });
    this.message_window.dispatchEvent(event);
  },
  request: function (url, body) {
    var that = this;
    return new Promise(function (resolve, reject) {
      var xmlhttp = new XMLHttpRequest();

      xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
          if (xmlhttp.status == 200) {
            var response = xmlhttp.responseText;
            var message = null;
            try {
              message = JSON.parse(response);
            } catch (err) {
              reject(err);
              return;
            }
            resolve(message);
          } else {
            reject(new Error('status_' + xmlhttp.status));
          }
        }
      };

      xmlhttp.open("POST", url, true);
      xmlhttp.setRequestHeader("Content-Type", "application/json");
      xmlhttp.send(JSON.stringify(body));
    });

  },
  send: function (text, e) {
    var that = this;
    if (e) e.preventDefault();
    if (!text) {
      return;
    }
    var message = {
      type: 'outgoing',
      text: text
    };
    this.clearReplies();
    that.renderMessage(message);

    that.deliverMessage({
      type: 'message',
      text: text,
      user: this.guid,
      channel: this.options.use_sockets ? 'socket' : 'webhook'
    });

    this.input.value = '';

    this.trigger('sent', message);

    return false;
  },
  sendCustom: function (text, payload, e) {
    
    var that = this;
    if (e) e.preventDefault();
    if (!text) {
      return;
    }
    var message = {
      type: 'outgoing',
      text: text
    };

    this.clearReplies();
    that.renderMessage(message);

    that.deliverMessage({
      ...payload,
      type: 'message',
      text: text,
      user: this.guid,
      channel: this.options.use_sockets ? 'socket' : 'webhook'
    });

    this.input.value = '';

    this.trigger('sent', message);

    return false;
  },
  sendCustomAction: function (text, payload, e) {
    
    var that = this;
    if (e) e.preventDefault();
    if (!text) {
      return;
    }
    var message = {
      type: 'outgoing',
      text: text
    };

    this.clearReplies();
  

    that.deliverMessage({
      ...payload,
      type: 'message',
      text: text,
      user: this.guid,
      channel: this.options.use_sockets ? 'socket' : 'webhook'
    });

    this.input.value = '';

    this.trigger('sent', message);

    return false;
  },
  deliverMessage: function (message) {
    // console.log("deliver");

    if (this.options.use_sockets) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.webhook(message);
    }
  },
  getHistory: function (guid) {
    var that = this;
    if (that.guid) {
      that.request('/botkit/history', {
        user: that.guid
      }).then(function (history) {
        if (history.success) {
          that.trigger('history_loaded', history.history);
        } else {
          that.trigger('history_error', new Error(history.error));
        }
      }).catch(function (err) {
        that.trigger('history_error', err);
      });
    }
  },
  webhook: function (message) {
    var that = this;

    that.request('/botkit/receive', message).then(function (message) {
      that.trigger(message.type, message);
    }).catch(function (err) {
      that.trigger('webhook_error', err);
    });

  },
  connect: function (user) {

    var that = this;

    if (user && user.id) {
      Botkit.setCookie('botkit_guid', user.id, 1);

      user.timezone_offset = new Date().getTimezoneOffset();
      that.current_user = user;
      console.log('CONNECT WITH USER', user);
    }

    // connect to the chat server!
    if (that.options.use_sockets) {
      that.connectWebsocket(that.config.ws_url);
    } else {
      that.connectWebhook();
    }

  },
  connectWebhook: function () {
    var that = this;
    if (Botkit.getCookie('botkit_guid')) {
      that.guid = Botkit.getCookie('botkit_guid');
      connectEvent = 'welcome_back';
    } else {
      that.guid = that.generate_guid();
      Botkit.setCookie('botkit_guid', that.guid, 1);
    }

    setId(that.guid);
    that.getHistory();

    // connect immediately
    that.trigger('connected', {});
    that.webhook({
      type: connectEvent,
      user: that.guid,
      channel: 'webhook',
    });

  },
  connectWebsocket: function (ws_url) {
    var that = this;
    // Create WebSocket connection.
    that.socket = new WebSocket(ws_url);

    var connectEvent = 'hello';
    if (Botkit.getCookie('botkit_guid')) {
      that.guid = Botkit.getCookie('botkit_guid');
      connectEvent = 'welcome_back';
    } else {
      that.guid = that.generate_guid();
      Botkit.setCookie('botkit_guid', that.guid, 1);
    }

    setId(that.guid);
    
    that.getHistory();

    // Connection opened
    that.socket.addEventListener('open', function (event) {
      // console.log('CONNECTED TO SOCKET');
      that.reconnect_count = 0;
      that.trigger('connected', event);
      that.deliverMessage({
        type: connectEvent,
        user: that.guid,
        channel: 'socket',
        user_profile: that.current_user ? that.current_user : null,
      });
    });

    that.socket.addEventListener('error', function (event) {
      // console.error('ERROR', event);
    });

    that.socket.addEventListener('close', function (event) {
      // console.log('SOCKET CLOSED!');
      that.trigger('disconnected', event);
      if (that.reconnect_count < that.config.max_reconnect) {
        setTimeout(function () {
          // console.log('RECONNECTING ATTEMPT ', ++that.reconnect_count);
          that.connectWebsocket(that.config.ws_url);
        }, that.config.reconnect_timeout);
      } else {
        that.message_window.className = 'offline';
      }
    });

    // Listen for messages
    that.socket.addEventListener('message', function (event) {
      var message = null;
      try {
        message = JSON.parse(event.data);
      } catch (err) {
        that.trigger('socket_error', err);
        return;
      }

      that.trigger(message.type, message);
    });
  },
  clearReplies: function () {
    this.replies.innerHTML = '';
  },
  quickReply: function (payload) {
    this.send(payload);
  },
  focus: function () {
    this.input.focus();
  },
  createNextLine : function () {
    var nextLine = document.createElement('div');
    nextLine.setAttribute("class", "real-message");
    return nextLine;
  },
  renderEditInform: function(message){
    var that = this;
    if (message.enableEditInform != null){
      
      if (!that.next_line) {
        that.next_line = document.createElement('div');
        that.message_list.appendChild(that.next_line);
      }
      

      message.resultSliderId = 'items-' + this.slider_message_count;
      this.slider_message_count += 1;

      that.next_line.className += " message-result-margin"
      that.next_line.innerHTML = that.message_slider_template({
        message: message
      });

      var sliderContainer = document.getElementById(`wrapper-${message.resultSliderId}`);
      var informEditTableContainer = this.renderInformEditTable(message.enableEditInform)
      sliderContainer.appendChild(informEditTableContainer)
      sliderContainer.setAttribute("max-width", 310);
      
      var list = document.createElement('ul');

      var li = document.createElement('li');
      var el = document.createElement('a');
      el.innerHTML = "Áp dụng";
      el.href = '#';

      el.onclick = function () {
        // that.sendCustom(reply.title, reply.payload);
        var informEditTable = informEditTableContainer.getElementsByTagName('table')[0]
        
        var totalRows = informEditTable.rows.length;
        var informObj = {};
        for (var i = 0 ; i < totalRows; i++) {
          
          var currentRow = informEditTable.rows.item(i);
          var currentSlot;
          var currentValue;
          for (var j = 0; j < currentRow.cells.length; j++) {
            

            if (currentRow.cells.item(j).getElementsByTagName("textarea").length > 0){
              
              currentValue = that.getInformValueHelper(currentRow.cells.item(j).getElementsByTagName("textarea")[0].value);
            } else {
              currentSlot = Object.keys(AGENT_INFORM_OBJECT).find(key => AGENT_INFORM_OBJECT[key] === currentRow.cells.item(j).innerHTML);
              
            }
          }
          informObj[currentSlot] = currentValue;
        }
        
        that.sendCustom(el.innerHTML, {userEditedInformSlot:{userInform:informObj}})
      }

      li.appendChild(el);
      list.appendChild(li);
      that.replies.appendChild(list);
      const sliderStyler = styler(that.next_line);
      if (sliderStyler != null){
        tween({
          from: { y: 100, scale: 0.1 },
          to: { y: 0 , scale: 1.0},
          ease: easing.backOut,
          duration: 500
        }).start(v => sliderStyler.set(v));
      }
      
      if (!message.isTyping) {
        delete (that.next_line);
      }
    }
  },
  getInformValueHelper: function(rawValue){
    rawValue = rawValue.trim()
    if (rawValue !== ""){
      listValue = rawValue.split(",")
      for (var i = 0; i < listValue.length; i++){
        listValue[i] = listValue[i].trim()
      }

      return listValue
    } else {
      return "anything"
    }
  }
  ,
  renderResults: function(message){
    var that = this;
    if (message.enableResponseToMathfound || message.enableResponseToCurrentResults)
    {
      if (!that.next_line) {
        that.next_line = document.createElement('div');
        that.message_list.appendChild(that.next_line);
      }
      // if (message.show_results) {

      message.resultSliderId = 'items-' + this.slider_message_count;
      this.slider_message_count += 1;
      // }
      that.next_line.className += " message-result-margin"
      that.next_line.innerHTML = that.message_slider_template({
        message: message
      });
           
      var list = that.renderResultMessages(message.listResults);

      
      var sliderContainer = document.getElementById(`wrapper-${message.resultSliderId}`);
      list.forEach(function (element) {
        sliderContainer.appendChild(element);
      })
      sliderContainer.setAttribute("max-width", list.length * 310);
      var a_left = $('<div class="carousel-prev"></div>')[0]
      var a_right = $('<div class="carousel-next"></div>')[0]
      var left = $('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z"></path> <path d="M0-.5h24v24H0z" fill="none"></path></svg>')[0]
      var right = $('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"></path> <path d="M0-.25h24v24H0z" fill="none"></path></svg>')[0]
      a_left.append(left)
      a_right.append(right)
      var mask = document.getElementById(`mask-${message.resultSliderId}`);
      var collapse_btn_wrapper = $('<div class="collapse-btn"></div>')[0];
      // var collapse_btn = $('<img>')[0];
      var collapse_btn = $('<img />', { 
        src: './icon/collapse_icon_up.png',
        width: 20,
        height: 20
      });
      collapse_btn.appendTo(collapse_btn_wrapper);
      var id = `wrapper-${message.resultSliderId}`;
      var oldHeight = $("#" + id).css('height');

      $(collapse_btn_wrapper).click(()=> {
        
        if ($("#" + id).css('height') > '1px'){
          // $("#" + id).css({'height': '0px'});  
          $(a_right).css({'display': 'none'});
          $(a_left).css({'display': 'none'});
          $("#" + id).animate({
            height: '0px'
          },500, function(){
            $("#" + id).css({'display': 'none'})
            $(collapse_btn).attr('src', './icon/collapse_icon_down.png');
          })
        } else {
          
          $(a_right).css({'display': 'block'});
          $(a_left).css({'display': 'block'});
          $("#" + id).css({'display': 'block'});


          $("#" + id).animate({
            height: oldHeight
          },500, function(){
            $(collapse_btn).attr('src', './icon/collapse_icon_up.png');

          })
        }
        
        
      })
      // collapse_btn.attr('src', './icon/collapse_icon.png');
      // collapse_btn_wrapper.append(collapse_btn);
      // console.log(a_left)
      $(a_left).hide();
      if (list.length == 1){
        $(a_right).hide();
      }
      $(a_right).click(() => {
        var id = `wrapper-${message.resultSliderId}`;
        var wrapperWidth = parseInt($("#" + id).attr("max-width"));
        var marginLeft = parseInt($("#" + id).css('margin-left'));
        var offset = RESULT_MESSAGE_WIDTH_TRANS;
        marginLeft -= offset;
        if (marginLeft >= (-wrapperWidth + RESULT_MESSAGE_WIDTH_TRANS)) {
          var str = marginLeft + "px !important";
          $("#" + id).attr('style', 'margin-left: ' + str);
          if (marginLeft - offset < (-wrapperWidth + RESULT_MESSAGE_WIDTH_TRANS)) {
            $(a_right).hide();
          }
        }
        $(a_left).show();
      })
      $(a_left).click(() => {
        var id = `wrapper-${message.resultSliderId}`;
        var marginLeft = parseInt($("#" + id).css('margin-left'));
        var offset = RESULT_MESSAGE_WIDTH_TRANS;
        marginLeft += offset;
        if (marginLeft >= 0) {
          marginLeft = 0;
          $(a_left).hide();
        }
        var str = marginLeft + "px !important";
        $("#" + id).attr('style', 'margin-left: ' + str);
        $(a_right).show();
      })
      mask.appendChild(collapse_btn_wrapper);

      mask.appendChild(a_left);
      mask.appendChild(a_right);
      const sliderStyler = styler(mask);
      if (sliderStyler != null){
        console.log('slider animated')
        tween({
          from: { y: 100, scale: 0.1 },
          to: { y: 0 , scale: 1.0},
          ease: easing.backOut,
          duration: 500
        }).start(v => sliderStyler.set(v));
      }
      // }
      if (!message.isTyping) {
        delete (that.next_line);
      }
    }
  }
  ,

  renderMessage: function (message) {
    var that = this;
    if (message.isAbleToSuggest){
      ableToSuggest = true;
    } 

    if (!that.next_line) {
      that.next_line = that.createNextLine();
    } 

    
    if (message.text) {
      message.html = converter.makeHtml(message.text);
    }
    const messageNode = that.message_template({
      message: message
    });
    that.next_line.innerHTML = messageNode;

      
    const boxStyler = styler(that.next_line);
    if (boxStyler != null){
      tween({
        from: { y: 100, scale: 0.1 },
        to: { y: 0 , scale: 1.0},
        ease: easing.backOut,
        duration: 500
      }).start(v => boxStyler.set(v));
    }
    

    that.message_list.appendChild(that.next_line);

    animateTyping()
    if (!message.isTyping) {
      delete (that.next_line);
    }
    
  },
  triggerScript: function (script, thread) {
    this.deliverMessage({
      type: 'trigger',
      user: this.guid,
      channel: 'socket',
      script: script,
      thread: thread
    });
  },
  identifyUser: function (user) {

    user.timezone_offset = new Date().getTimezoneOffset();

    this.guid = user.id;
    Botkit.setCookie('botkit_guid', user.id, 1);

    this.current_user = user;

    this.deliverMessage({
      type: 'identify',
      user: this.guid,
      channel: 'socket',
      user_profile: user,
    });
  },
  receiveCommand: function (event) {
    switch (event.data.name) {
      case 'trigger':
        Botkit.triggerScript(event.data.script, event.data.thread);
        break;
      case 'identify':
        Botkit.identifyUser(event.data.user);
        break;
      case 'connect':
        Botkit.connect(event.data.user);
        console.log("event data user " + event.data.user);
        break;
      default:
    }
  },
  sendEvent: function (event) {

    if (this.parent_window) {
      this.parent_window.postMessage(event, '*');
    }

  },
  setCookie: function (cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  },
  getCookie: function (cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  },
  generate_guid: function () {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  },
  renderInformEditTable: function(result) {
    var title = `<div class="tittle">Thông tin đã cung cấp:</div></marquee>`

    var list_row = '';
    
    for (var slot in result){
      if ( Array.isArray(result[slot]) && result[slot].length > 0){
        var value = result[slot].join(", ");

        list_row += `<tr><th>${AGENT_INFORM_OBJECT[slot]}</th><td><textarea>${value}</textarea></td></tr>`;

      }
      else {
        continue;
      }
    }
    
    var table = `<table>${list_row}</table>`
    
    var li = $('<div class="message-result">' + title + table  + '</div>')[0]
    return li;
  },
  renderResultMessages: function (results) {
    var that = this;
    var elements = [];
    var len = Math.min(10, results.length);
    var count = 1;
    
    // console.log("RESULT");
    // console.log(results);
    // console.log(concerned_attributes);
    for (var r = 0; r < len; r++) {
      (function (result) {

        // var title = `<div class="tittle"><a href="${result.url}" target="#">${result.tittle}</div></marquee>`
        var title = `<div class="tittle">Hoạt động: ${result['name_activity']}</div></marquee>`
        var compositeContainer;
        var list_row = '';
        for (var slot in result){
          
          if ( Array.isArray(result[slot]) && result[slot].length > 0){
            
            if (slot === 'time_works_place_address_mapping'){
              // console.log(this)
              // this.Botkit.createCompositeContainer.bind(Botkit);
              console.log(that)

              compositeContainer = that.createCompositeContainer(result[slot], count);
              count++;
              continue;
            }
            var value = "<li>" + result[slot].join("</li><li>") + "</li>";
            list_row += `<tr><th>${AGENT_INFORM_OBJECT[slot]}</th><td>${value}</td></tr>`;

          } else {
            continue;
          }
        }
        
        var table = `<table>${list_row}</table>`
        
        var el = $('<div class="message-result">' + title + table + '</div>')[0]
        if (compositeContainer != null){
          el.appendChild(compositeContainer);
        }
        elements.push(el);
      })(results[r]);
    }
    return elements;
  },
  renderSubTable: function (results) {
    var that = this;
    var elements = [];
    var len = Math.min(10, results.length);
    // console.log("RESULT");
    // console.log(results);
    // console.log(concerned_attributes);
    for (var r = 0; r < len; r++) {
      (function (result) {

        // var title = `<div class="tittle"><a href="${result.url}" target="#">${result.tittle}</div></marquee>`
        var title = `<div class="tittle">Chi tiết:</div></marquee>`
        var compositeContainer;
        var list_row = '';
        
        for (var slot in result){
          
          if ( Array.isArray(result[slot]) && result[slot].length > 0){
            
            var value = "<li>" + result[slot].join("</li><li>") + "</li>";
            list_row += `<tr><th>${AGENT_INFORM_SUB_OBJECT[slot]}</th><td>${value}</td></tr>`;

          } else {
            continue;
          }
        }
        
        var table = `<table>${list_row}</table>`
        
        var el = $('<div class="sub-message-result">' + title + table + '</div>')[0]
        if (compositeContainer != null){
          el.appendChild(compositeContainer);
        }
        elements.push(el);
      })(results[r]);
    }
    return elements;
  },
  createCompositeContainer : function(compoElementList, count){
    var that = this;
    var sliderInit = {}
    sliderInit.resultSliderId = `child-slider-${this.slider_message_count}-${count}`
    
    var compositeContainer = $(that.message_slider_template({
      message: sliderInit
    }))[0];
    var sliderCompositeContainer = compositeContainer.children[0];
    

    var list = that.renderSubTable(compoElementList);

    list.forEach(function (element) {
      sliderCompositeContainer.appendChild(element);
    })
    sliderCompositeContainer.setAttribute("max-width", list.length * RESULT_SUB_TABLE_WIDTH_TRANS);
    // sliderCompositeContainer.setAttribute("max-width", list.length * RESULT_SUB_TABLE_WIDTH_TRANS);
    
    var a_left = $('<div class="carousel-prev"></div>')[0]
    var a_right = $('<div class="carousel-next"></div>')[0]
    var left = $('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z"></path> <path d="M0-.5h24v24H0z" fill="none"></path></svg>')[0]
    var right = $('<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"></path> <path d="M0-.25h24v24H0z" fill="none"></path></svg>')[0]
    a_left.append(left)
    a_right.append(right)
    // var mask = document.getElementById(`mask-${message.resultSliderId}`);
    // console.log(a_left)

    $(a_left).hide();
    $(a_right).click(() => {
      var id = `wrapper-${sliderInit.resultSliderId}`;
      var wrapperWidth = parseInt($("#" + id).attr("max-width"));
      var marginLeft = parseInt($("#" + id).css('margin-left'));
      var offset = RESULT_SUB_TABLE_WIDTH_TRANS;
      marginLeft -= offset;
      if (marginLeft >= (-wrapperWidth + RESULT_SUB_TABLE_WIDTH_TRANS)) {
        var str = marginLeft + "px !important";
        $("#" + id).attr('style', 'margin-left: ' + str);
        if (marginLeft - offset < (-wrapperWidth + RESULT_SUB_TABLE_WIDTH_TRANS)) {
          $(a_right).hide();
        }
      }
      $(a_left).show();
    })
    $(a_left).click(() => {
      var id = `wrapper-${sliderInit.resultSliderId}`;
      var marginLeft = parseInt($("#" + id).css('margin-left'));
      var offset = RESULT_MESSAGE_WIDTH_TRANS;
      marginLeft += offset;
      if (marginLeft >= 0) {
        marginLeft = 0;
        $(a_left).hide();
      }
      var str = marginLeft + "px !important";
      $("#" + id).attr('style', 'margin-left: ' + str);
      $(a_right).show();
    })
    compositeContainer.appendChild(a_left);
    compositeContainer.appendChild(a_right);
    console.log('compositeContainer: ')
    console.log(compositeContainer)
    return compositeContainer;
  },
  // renderResultMessages: function (results, concerned_attributes) {
  //   var elements = [];
  //   var len = Math.min(10, results.length);
  //   // console.log("RESULT");
  //   // console.log(results);
  //   // console.log(concerned_attributes);
  //   for (var r = 0; r < len; r++) {
  //     (function (result) {

  //       var title = `<div class="tittle"><a href="${result.url}" target="#">${result.tittle}</div></marquee>`
  //       var list_row = '';
  //       var count = 0;
  //       for (var i = 0; i < concerned_attributes.length; i++)
  //         if (result[concerned_attributes[i]] && count < MAX_ATTR) {
  //           let raw_key = concerned_attributes[i] + "_raw";
  //           if (concerned_attributes[i] === "interior_floor" || concerned_attributes[i] === "interior_room") {
  //             raw_key = concerned_attributes[i];
  //           }
  //           if (concerned_attributes[i] === "orientation" & result[concerned_attributes[i]] === "Không xác định") {
  //             continue;
  //           }
  //           if (concerned_attributes[i] === "addr_district" || concerned_attributes[i] === "potential") {
  //             continue;
  //           }
  //           count += 1;
  //           var val = result[raw_key] ? result[raw_key] : result[concerned_attributes[i]]
  //           var row = `<tr><th>${key2vn[concerned_attributes[i]]}</th><td>: ${val}</td></tr>`;
  //           list_row += row;
  //         }
  //       list_row += `<tr><th>Địa chỉ</th><td>: ${result["address"]}</td></tr>`;
  //       list_row += `<tr><th>Ngày đăng</th><td>: ${result["publish_date"]}</td></tr>`;
  //       var table = `<table>${list_row}</table>`

  //       var li = $('<div class="message-result">' + title + table + '</div>')[0]
  //       elements.push(li);
  //     })(results[r]);
  //   }
  //   return elements;
  // },
  setId: function(userId){
    document.getElementById("user-id").innerHTML = "CSE Assistant Beta";
  },
  boot: function (user) {

    this.setId(this.guid);
    var that = this;

    that.message_window = document.getElementById("message_window");

    that.message_list = document.getElementById("message_list");

    var source = document.getElementById('message_template').innerHTML;
    that.message_template = Handlebars.compile(source);

    var custom_source = document.getElementById('message_slider_template').innerHTML;
    that.message_slider_template = Handlebars.compile(custom_source);

    var custom_source_2 = document.getElementById('message_list_template').innerHTML;
    that.message_list_template = Handlebars.compile(custom_source_2);

    var custom_source_3 = document.getElementById('message_intent_template').innerHTML;
    that.message_intent_template = Handlebars.compile(custom_source_3);

    var custom_source_4 = document.getElementById('message_rating_template').innerHTML;
    that.message_rating_template = Handlebars.compile(custom_source_4);

    that.replies = document.getElementById('message_replies');

    that.input = document.getElementById('messenger_input');

    that.focus();

    that.on('connected', function () {
      that.message_window.className = 'connected';
      that.input.disabled = false;
      that.sendEvent({
        name: 'connected'
      });
    })

    that.on('disconnected', function () {
      that.message_window.className = 'disconnected';
      that.input.disabled = true;
    });

    that.on('webhook_error', function (err) {
      alert('Error sending message!');
    });

    that.on('typing', function () {
      that.clearReplies();
      console.log('typing');
      that.renderMessage({
        isTyping: true
      });
    });

    that.on('sent', function () {
      deleteElement();
      if (ableToSuggest != undefined) {
        ableToSuggest = false;
      }
      if (that.options.sound) {
        var audio = new Audio('sent.mp3');
        audio.play();
      }
    });

    that.on('message', function () {
      if (that.options.sound) {
        var audio = new Audio('beep.mp3');
        audio.play();
      }
    });

    that.on('message', function (message) {

      
      that.renderMessage(message);
      that.renderResults(message);
      that.renderEditInform(message);
    });

    that.on('message', function (message) {
      if (message.goto_link) {
        window.location = message.goto_link;
      }
    });


    
    // that.on('message', function (message) {
    //   that.clearReplies();
    //   if (message.quick_replies) {

    //     var list = document.createElement('ul');

    //     var elements = [];
    //     for (var r = 0; r < message.quick_replies.length; r++) {
    //       (function (reply) {

    //         var li = document.createElement('li');
    //         var el = document.createElement('a');
    //         el.innerHTML = reply.title;
    //         el.href = '#';

    //         el.onclick = function () {
    //           that.quickReply(reply.payload);
    //         }

    //         li.appendChild(el);
    //         list.appendChild(li);
    //         elements.push(li);

    //       })(message.quick_replies[r]);
    //     }

    //     that.replies.appendChild(list);

    //     if (message.disable_input) {
    //       that.input.disabled = true;
    //     } else {
    //       that.input.disabled = false;
    //     }
    //   } else {
    //     that.input.disabled = false;
    //   }
    // });

    // that.on('message', function (message) {
    //   that.clearReplies();
    //   // console.log("outside");
    //   if (message.force_result) {
    //     console.log("inside" + message.force_result);
    //     var list = document.createElement('ul');

    //     var elements = [];
    //     for (var r = 0; r < message.force_result.length; r++) {
    //       (function (reply) {

    //         var li = document.createElement('li');
    //         var el = document.createElement('a');
    //         el.innerHTML = reply.title;
    //         el.href = '#';
            
            
            
    //         el.onclick = function () {
    //           console.log("inside onclick");
    //           that.sendCustom(reply.title, reply.payload);
              
    //         }
            

    //         console.log("below onclick");

    //         li.appendChild(el);
    //         list.appendChild(li);
    //         elements.push(li);

    //       })(message.force_result[r]);
    //     }

    //     that.replies.appendChild(list);

    //     if (message.disable_input) {
    //       that.input.disabled = true;
    //     } else {
    //       that.input.disabled = false;
    //     }
    //   } else {
    //     that.input.disabled = false;
    //   }
    // });
    that.on('message', function (message){
      
      if (message.enableResponseToCurrentResults){
        that.clearReplies();

        var list = document.createElement('ul');

        var elements = [];
        for (var r = 0; r < message.enableResponseToCurrentResults.length; r++) {
          (function (reply) {
            console.log("create element match found")

            var li = document.createElement('li');
            var el = document.createElement('a');
            el.innerHTML = reply.title;
            el.href = '#';

            el.onclick = function () {
              that.sendCustom(reply.title, reply.payload);
            }

            li.appendChild(el);
            list.appendChild(li);
            elements.push(li);

          })(message.enableResponseToCurrentResults[r]);
        }

        that.replies.appendChild(list);

        if (message.disable_input) {
          that.input.disabled = true;
        } else {
          that.input.disabled = false;
        }
      }
      if (message.enableResponseToConfirm){
        that.clearReplies();

        var list = document.createElement('ul');

        var elements = [];
        for (var r = 0; r < message.enableResponseToConfirm.length; r++) {
          (function (reply) {
            console.log("create element confirm")

            var li = document.createElement('li');
            var el = document.createElement('a');
            el.innerHTML = reply.title;
            el.href = '#';

            el.onclick = function () {
              that.sendCustom(reply.title, reply.payload);
            }

            li.appendChild(el);
            list.appendChild(li);
            elements.push(li);

          })(message.enableResponseToConfirm[r]);
        }

        that.replies.appendChild(list);

        if (message.disable_input) {
          that.input.disabled = true;
        } else {
          that.input.disabled = false;
        }
      }
    });
    that.on('message', function (message){
      

      if (message.enableResponseToMathfound){
        that.clearReplies();

        var list = document.createElement('ul');

        var elements = [];
        for (var r = 0; r < message.enableResponseToMathfound.length; r++) {
          (function (reply) {
            console.log("create element match found")

            var li = document.createElement('li');
            var el = document.createElement('a');
            el.innerHTML = reply.title;
            el.href = '#';

            el.onclick = function () {
              that.sendCustom(reply.title, reply.payload);
            }

            li.appendChild(el);
            list.appendChild(li);
            elements.push(li);

          })(message.enableResponseToMathfound[r]);
        }

        that.replies.appendChild(list);

        if (message.disable_input) {
          that.input.disabled = true;
        } else {
          that.input.disabled = false;
        }
      }
    });
    // that.on('message', function (message) {
    //   console.log("FORCE")
    //   if (message.force_result) {
    //     that.clearReplies();

    //     var list = document.createElement('ul');

    //     var elements = [];
    //     for (var r = 0; r < message.force_result.length; r++) {
    //       (function (reply) {

    //         var li = document.createElement('li');
    //         var el = document.createElement('a');
    //         el.innerHTML = reply.title;
    //         el.href = '#';

    //         el.onclick = function () {
    //           that.sendCustom(reply.title, reply.payload);
    //         }

    //         li.appendChild(el);
    //         list.appendChild(li);
    //         elements.push(li);

    //       })(message.force_result[r]);
    //     }

    //     that.replies.appendChild(list);

    //     if (message.disable_input) {
    //       that.input.disabled = true;
    //     } else {
    //       that.input.disabled = false;
    //     }
    //   } else {
    //     that.input.disabled = false;
    //   }
    // });

    that.on('history_loaded', function (history) {
      if (history) {
        for (var m = 0; m < history.length; m++) {
          that.renderMessage({
            text: history[m].text,
            type: history[m].type == 'message_received' ? 'outgoing' : 'incoming', // set appropriate CSS class
          });
        }
      }
    });


    if (window.self !== window.top) {
      that.parent_window = window.parent;
      window.addEventListener("message", that.receiveCommand, false);
      that.sendEvent({
        type: 'event',
        name: 'booted'
      });

    } else {
      that.connect(user);
    }

    return that;
  }
};

var setId = function(id){
  document.getElementById("user-id").innerHTML = "CSE Assistant Beta";
};

(function () {
  Botkit.boot();
  // Botkit.setId();
})();


