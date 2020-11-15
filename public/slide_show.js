var slideIndex = 1;
var timeout;
showSlides(slideIndex);

// Next/previous controls
function plusSlides(n) {
  clearTimeout(timeout);
  showSlides(slideIndex += n);
}

// Thumbnail image controls
function selectSlide(n) {
  console.log('show slide: ' + n);
  clearTimeout(timeout);
  showSlides(slideIndex = n);
}
function autoIncrease() {
  plusSlides(1);
}

function showSlides(n) {
  var i;
  var slides = document.getElementsByClassName("mySlides");
  var dots = document.getElementsByClassName("dot");
  if (n > slides.length) {slideIndex = 1}
  if (n < 1) {slideIndex = slides.length}
  for (i = 0; i < slides.length; i++) {
      slides[i].style.display = "none";
  }
  for (i = 0; i < dots.length; i++) {
      dots[i].className = dots[i].className.replace(" slideActive", "");
  }
  slides[slideIndex-1].style.display = "block";
  dots[slideIndex-1].className += " slideActive";
  timeout = setTimeout(autoIncrease, 3000);
}