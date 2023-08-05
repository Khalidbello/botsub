// home.js filegg

// function to change window location
function changeLocation() {
  const ele = event.target;

  ele.style.backgroundColor = 'darkorange';
  ele.style.color = 'white';

  setTimeout(() => {
    if (ele.id === 'cta-button') return (ele.style.backgroundColor = 'darkorange');
    ele.style.backgroundColor = 'white';
    ele.style.color = 'darkorange';
  }, 300);

  setTimeout(() => {
    window.location = ele.dataset.location;
  }, 500);
} // end of changeLocation

const menuIcon = document.getElementById('menu-icon');
const navMenu = document.getElementById('nav-menu');
const hideIcon = document.getElementById('cancel-icon');
let menuFlag = 'hidden';

menuIcon.addEventListener('click', toggleNavMenu);
navMenu.addEventListener('click', toggleNavMenu);

// function to show nav bar
function toggleNavMenu() {
  if (menuFlag === 'hidden') {
    navMenu.style.top = '10px';
    menuIcon.style.opacity = '0.4';
    hideIcon.style.backgroundColor = 'transparent';
    menuFlag = 'visible';
  } else {
    navMenu.style.top = '-800px';
    hideIcon.style.backgroundColor = 'darkorange';
    menuIcon.style.opacity = '1';
    menuFlag = 'hidden';
  }
  console.log(navMenu.style.left);
  console.log(navMenu.style.display);
} // end of toggle navMenu

const carouselInner = document.querySelector('.carousel-inner');
const carouselItems = document.querySelectorAll('.carousel-item');
const prevButton = document.querySelector('.carousel-controls button:first-child');
const nextButton = document.querySelector('.carousel-controls button:last-child');
let currentIndex = 0;
let carouselAuto;

function prevSlide() {
  if (currentIndex === 0) {
    currentIndex = carouselItems.length - 1;
  } else {
    currentIndex--;
  }
  updateCarousel();
}

function nextSlide() {
  if (currentIndex === carouselItems.length - 1) {
    currentIndex = 0;
  } else {
    currentIndex++;
  }
  updateCarousel();
}

function updateCarousel() {
  carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
  clearInterval(carouselAuto);
  carouselAuto = setInterval(() => nextSlide(), 5000);
} // end of updateCarousel

// adding scroll detector to carousel
let startX = 0;

carouselInner.addEventListener('touchstart', function (event) {
  startX = event.touches[0].clientX;
});
carouselInner.addEventListener('touchend', function (event) {
  const distX = startX - event.changedTouches[0].clientX;
  if (Math.abs(distX) > 50) {
    if (distX > 0) return nextSlide();
    prevSlide();
  }
});

// to auto scroll customer review

// codes for scroll animation
const contents = document.querySelectorAll('.scroll-anime');

const options = {
  root: null,
  rootMargin: '0px',
  threshold: 0.7, // Adjust the threshold value as needed
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const ele = entry.target;
      ele.classList.add(ele.dataset.anime);
      ele.style.opacity = 1;

      if (ele.dataset.type === 'customer-reviews') {
        setTimeout(nextSlide, 2000);
      }

      observer.unobserve(entry.target); // Stop observing once the content is shown
    }
  });
}, options);

contents.forEach((content) => {
  observer.observe(content);
});
