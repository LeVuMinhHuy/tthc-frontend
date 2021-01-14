var converter = new showdown.Converter();
converter.setOption('openLinksInNewWindow', true);

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
    if (this.options.use_sockets) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.webhook(message);
    }
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
    }

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
  createNextLine: function () {
    var nextLine = document.createElement('div');
    nextLine.setAttribute("class", "real-message");
    return nextLine;
  },
  renderMessage: function (message) {
    var that = this;
    if (message.isAbleToSuggest) {
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
    if (boxStyler != null) {
      tween({
        from: { y: 100, scale: 0.1 },
        to: { y: 0, scale: 1.0 },
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
  renderOptions: function(options){
    var that = this;
    if (!that.next_line) {
      that.next_line = that.createNextLine();
    }
    res = document.createElement('div');
    options.forEach((v)=>{
      wrapper = document.createElement('div');
      button = document.createElement('button');
      text1 = document.createTextNode(v.id);
      text2 = document.createTextNode(v.name);
      
      button.appendChild(text1);
      wrapper.appendChild(button);
      wrapper.appendChild(text2);
      res.appendChild(wrapper);
    })
    console.log(res.outerHTML);
    const messageNode = that.message_template({
      message: {
        type: 'ingoing',
        html: res.outerHTML,
      }
    });
    that.next_line.innerHTML = messageNode;
    that.message_list.appendChild(that.next_line);
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
  setId: function (userId) {
    document.getElementById("user-id").innerHTML = "TTHC Chatbot";
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
      if(message.type==='tthc'){
        that.renderOptions(['a','g','f','e','d'])
      } else {that.renderMessage(message);}
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

var setId = function (id) {
  document.getElementById("user-id").innerHTML = "TTHC Chatbot";
};

(function () {
  Botkit.boot();
})();