const { styler, everyFrame, tween , easing } = popmotion;
// var styler


function animateTyping(){
	const container = document.querySelector('.real-message .typing-indicator-custom');
	
	if (container != null){
		const ballStylers = Array
		  .from(container.childNodes)
		  .map(styler);

		const distance = 5;
		everyFrame()
		  .start((timestamp) => ballStylers.map((thisStyler, i) => {
		  	// console.log(distance * Math.sin(0.004 * timestamp + (i * 0.5)))
		  	// console.log(`${i} : ${thisStyler.get('y')}`);
		    thisStyler.set('y', distance * Math.sin(0.007 * timestamp + (i * 0.5)));
		}));
	}
}

