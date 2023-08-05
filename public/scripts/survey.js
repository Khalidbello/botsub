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

function home() {
  const ele = event.target;
  ele.style.backgroundColor = 'darkorange';
  setTimeout(() => {
    ele.style.backgroundColor = 'transparent';
    window.location = '/';
  }, 400);
}

const questionBox = document.querySelector('#question-box');
const carousel = document.querySelector('#carousel');
const surveyIntro = document.querySelector('#survey-intro');
const startBt = questionBox.querySelector('#start-survey');
const back = questionBox.querySelector('#previous');
const gender = questionBox.querySelector('#gender');
const network = questionBox.querySelector('#network');
const dataSize = questionBox.querySelector('#data-size');
const dataFrequency = questionBox.querySelector('#data-frequency');
const email = questionBox.querySelector('#email');
const loader = document.querySelector('#loader');
const blur = document.querySelector('#blur');

// function to start survey
let currentIndex;

function prevSlide(reset = false) {
  const ele = event.target;
  ele.style.backgroundColor = 'darkorange';
  setTimeout(() => (ele.style.backgroundColor = 'transparent'), 200);
  if (reset) currentIndex = 1;

  if (currentIndex === 1) {
    back.style.opacity = 0;

    setTimeout(() => {
      back.style.display = 'none';
    }, 500);
  }

  currentIndex--;
  updateCarousel(currentIndex);
}

function nextSlide(index) {
  currentIndex = index;
  console.log(index);
  back.style.display = 'block';
  back.dataset.index = 0;

  setTimeout(() => {
    back.style.opacity = 1;
  }, 800);

  updateCarousel(index);
}

function updateCarousel(index) {
  carousel.style.transform = `translateX(-${index * 100}%)`;
} // end of carousel

// function to be called once an option is selected

function selected(current) {
  const option = event.target;
  const parent = event.currentTarget;

  if (!option.dataset.value) return null;

  // incase of doubling clicking
  const children = parent.children;
  for (const ele of children) {
    if (ele.dataset.value) ele.style.opacity = 0.5;
  }

  option.style.opacity = 1;

  setTimeout(() => (option.style.opacity = 0.5), 1000);
  current.dataset.value = option.dataset.value;
  nextSlide(parseInt(parent.dataset.index));
} // end  of selected function

// function to change email border if valid

function checkEmail() {
  ele = event.target;
  emailInput = document.querySelector('input[type="email"]');
  if (emailInput.checkValidity()) {
    return (emailInput.style.border = 'thin solid green');
  }
  return (emailInput.style.border = 'thin solid #ddd');
} // end of done
// function to handle back click

function showPrevious() {
  let currentIndex = parseInt(event.target.dataset.index);
  back.dataset.index = parseInt(back.dataset.index) - 1;

  if (currentIndex == 0) {
    startBt.style.display = 'block';
    surveyIntro.style.display = 'block';
    back.style.opacity = 0;
    gender.style.left = '100%';
    setTimeout(() => {
      back.style.display = 'none';
      gender.style.display = 'none';
      startBt.style.opacity = 1;
      surveyIntro.style.opacity = 1;
    }, 550);
    return;
  }

  sections[currentIndex].style.left = '100%';
  sections[currentIndex - 1].style.display = 'block';
  setTimeout(() => {
    sections[currentIndex].style.display = 'none';
    sections[currentIndex - 1].style.left = 0;
  }, 500);
} // end of showPrevious*/

// function to handle submitting of data

const successBox = document.querySelector('#success-box');
const errorBox = document.querySelector('#error-box');

async function submitData() {
  // first check email validity before submitting
  event.preventDefault();
  ele = event.target;
  emailInput = document.querySelector('input[type="email"]');
  console.log('email input', emailInput);

  if (!emailInput.checkValidity()) {
    return (emailInput.style.border = 'thin solid red');
  }

  // submittng data
  blur.style.display = 'block';
  loader.style.display = 'block';

  try {
    const url = '/front-api/survey';
    const data = {
      email: emailInput.value,
      network: network.dataset.value,
      dataSize: dataSize.dataset.value,
      dataFrequency: dataFrequency.dataset.value,
      gender: gender.dataset.value,
    };
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const resp = await response.json();

    if (resp.status === 'success') {
      showSuccessfulSurvey();
    } else {
      showErroneousSurvey();
    }
  } catch (err) {
    console.log('an error occurred', err);
    showErroneousSurvey();
  }
}

function showSuccessfulSurvey() {
  blur.style.opacity = 1;
  loader.style.display = 'none';
  successBox.style.top = '80px';
}

function showErroneousSurvey() {
  blur.style.opacity = 1;
  loader.style.display = 'none';
  errorBox.style.top = '80px';
}

//function to resetSurvey
function resetSurvey() {
  // resetting email field
  emailInput.value = '';

  prevSlide((reset = true));
  errorBox.style.top = '-300px';
  successBox.style.top = '-300px';

  setTimeout(() => {
    blur.style.opacity = '0.4';
    blur.style.display = 'none';
  }, 1090);
}
