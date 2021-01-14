const GET_LATEST_API = 'http://localhost:8080/api/cse-assistant-conversation-manager/latest-activities';
var latestSpinner = null;
var latestWrapper = null;
var panel = $("#latest-popup-panel");


function createSubview(){
	latestWrapper = $('<div />', { 
      	id: 'latest-wrapper'
    });
  
	latestSpinner = $('<div/>', {
		id: 'latest-loader-spinner'
	});
	latestSpinner.appendTo(panel);

	latestWrapper.appendTo(panel);
}
createSubview();

var renderLatestActivities = (data) => {
  // var list = document.createElement('ul');
  // var replyList = document.getElementById('message_replies');
  if (panel != null){
    $("#latest-wrapper div").remove();
    $("#latest-wrapper hr").remove();
    
  }
  // replyList.innerHTML = '';
  // var elements = [];
  for (var r = 0; r < data.length; r++) {
    (function (reply) {
      

	var li = $('<div/>', {
		class: 'latest-item'
	});
	var name_activity = $('<div/>', {
		class: 'latest-item-name_activity'
	});
	var name_activity_bold = $('<b/>');
	var name_activity_italic = $('<i/>');
	var holder = $('<div/>', {
		class: 'latest-item-holder'
	});
	var holder_bold = $('<b/>',{ 
		text: "BTC: "
	});
	var holder_value = $('<span/>');
	var time = $('<div/>', {
		class: 'latest-item-time'
	})
	var reward = $('<div/>', {
		class: 'latest-item-reward'
	});
	var reward_bold = $('<b/>', {
		text: "Quyền lợi: "
	});
	var reward_value = $('<span/>');

	// name_activity.text(data[r].name_activity[0]);
	name_activity_italic.text(data[r].name_activity[0]);
	name_activity_italic.appendTo(name_activity_bold);
	name_activity_bold.appendTo(name_activity);
    
    holder_bold.appendTo(holder);
    holder_value.text(data[r].holder[0] != undefined ? data[r].holder[0] : "chưa rõ");
    holder_value.appendTo(holder);

	time.text(data[r].time[0]);
	reward_bold.appendTo(reward);
	reward_value.text((data[r].reward[0] != undefined ? data[r].reward[0] : "chưa rõ"));
	reward_value.appendTo(reward);
    if (r != 0){
		var hr = $('<hr>', {
			style: 'margin: 2px auto !important; width: 90%; clear: both; background-color: lightgrey;'
		});
		hr.appendTo(latestWrapper);

    }  

	// el.onclick = function () {
	//   // that.sendCustom(reply.title, reply.payload);

	//   if (Botkit != null){
	//     Botkit.sendCustom(el.innerHTML, {});
	//     // ableToSuggest = false;
	//   }
	// }
	name_activity.appendTo(li);
	holder.appendTo(li);
	reward.appendTo(li);
	time.appendTo(li);

	li.appendTo(latestWrapper);
	// li.appendChild(el);
	// latestWrapper.appendChild(li);
      
      // elements.push(li);

    })(data[r]);
  }
  if (panel != null){
    $(latestWrapper).appendTo(panel);  
  }
  
  // replyList.appendChild(list);
}
// When the user clicks on <div>, open the popup
function toggleLatestPanel() {
	// var popup = document.getElementById("latest-popup-panel");
	// popup.classList.toggle("show");
	var panelVisibility = panel.css('visibility');
	if (panelVisibility == 'hidden'){
		panel.css({visibility : 'visible'});
		panel.animate({
			opacity: 1
		}, 300, function(){
			var input = ""
		    latestSpinner.css("display", "block");

			$.ajax({
		      type: 'get',
		      url: GET_LATEST_API,
		      data: JSON.stringify({}),
		      crossDomain: true,
		      contentType: "application/json; charset=utf-8",
		      traditional: true,
		      success: function (data) {
		          console.log(data.result);
		          renderLatestActivities(data.result);
		          latestSpinner.css("display", "none");

		      },
		      error: function(jqXHR, textStatus, errorThrown){
		          latestSpinner.css("display", "none");
		          console.log('error: ' + errorThrown);
		      }
		    });
			panel.attr("tabindex",-1).focus();

		    panel.focusout(function(){
		    	toggleLatestPanel();
		    })
		})
	}
	else if (panelVisibility == 'visible') {
		panel.animate({
			opacity: 0
		}, 300, function(){
			
			panel.css({visibility : 'hidden'});
			panel.off("focusout");
		})
	}
}
