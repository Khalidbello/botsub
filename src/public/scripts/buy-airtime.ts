let drkb = '#112';
let orange = 'darkorange';
let queryBox = document.querySelector('#query-box');
let form = document.querySelector('#form');
let networkBox = form.querySelector('#network-box');
let amount = form.querySelector('#amount');
let amountWarning = form.querySelector('#amount-warning');
let number = form.querySelector('#number');
let name = form.querySelector('#name');
let email = form.querySelector('#email');
let networkWarning = form.querySelector('#network-warning');
let emailWarning = form.querySelector('#email-warning');
let numberWarning = form.querySelector('#number-warning');
let phoneError = form.querySelector('#phone-error');
let numberValidator = form.querySelector('#number-validator');
let validatorState = form.querySelector('#validator-state');
let invalidNumberBox = document.querySelector('#invalid-number-box');
let currentBox = null;
let networks = document.querySelector('#networks');
let blur = document.querySelector('#blur');

let validNumbers = {
  mtn: ['0803', '0816', '0903', '0810', '0806', '0703', '0706', '0813', '0814', '0906', '0916'],
  glo: ['0805', '0905', '0807', '0811', '0705', '0815'],
  nineMobile: ['0909', '0908', '0818', '0809', '0817'],
  airtel: ['0907', '0708', '0802', '0902', '0812', '0808', '0701', '0904'],
};

let key;

async function getKey() {
  const response = await fetch('front-api/get-key');
  const datas = await response.json();
  key = datas.key
}; 
getKey();

//adding event listener for animation to networks
//networks.addEventListener("animationend", endListener, false);

//adding event listener to phoneError

phoneError.addEventListener('animationend', handlePhoneError, false);

// function to be called by back button

function home() {
  const ele = event.target;
  ele.style.backgroundColor = 'darkorange';
  setTimeout(() => {
    ele.style.backgroundColor = 'transparent';
    window.location = '/';
  }, 200);
}

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

// function to show info-box
showQueryBox = function () {
  event.stopPropagation();
  let ele = event.target;

  ele.style.backgroundColor = 'darkorange';
  queryBox.style.display = 'block';

  setTimeout(() => {
    ele.style.backgroundColor = 'white';
    queryBox.style.opacity = 1;
  }, 100);
}; // end of showQueryBox

// function to hideQueryBox
hideQueryBox = function () {
  let ele = event.target;
  let hide = false;

  if (ele.tagName === 'svg') {
    hide = true;
    ele.style.backgroundColor = 'darkorange';
    queryBox.style.opacity = 0;
    setTimeout(() => (ele.style.backgroundColor = 'transparent'), 500);
  } else if (ele.dataset.location) {
    hide = true;
    ele.style.backgroundColor = '#ddf';
    setTimeout(() => {
      ele.style.backgroundColor = '#ccc';
      ele.style.color = 'black';
      window.location = ele.dataset.location;
    }, 1100);
  }
  if (hide) {
    queryBox.style.opacity = 0;
    setTimeout(() => (queryBox.style.display = 'none'), 1100);
  }
}; // end of hideQueryBox

// function to be called by select network

function showNetwork(ele) {
  console.log(ele.value);
  networks.style.display = 'block';
  setTimeout(() => {
    networks.style.top = '50px';
    networks.style.opacity = '1';
    blur.style.display = 'block';
    currentBox = networks;
  }, 10);
} // end of showNetwork

//function to hide boxes

function hideBox() {
  let ele = event.target;
  if (ele.tagName === 'svg') {
    ele.style.backgroundColor = 'darkorange';
  }

  setTimeout(() => {
    currentBox.style.top = '-500px';
    currentBox.style.opacity = 0;
  }, 200);

  setTimeout(() => {
    blur.style.display = 'none';
    currentBox.style.display = 'none';
    if (ele.tagName === 'svg') {
      ele.style.backgroundColor = 'transparent';
    }
  }, 500);
} // end hideBox

// function highlight clicked

highlightClicked = function (ele) {
  ele.style.opacity = 0.3;
  setTimeout(() => (ele.style.opacity = 1), 1000);
};

// function to be called when a network is selected

function networkSelected(ele) {
  highlightClicked(ele);
  networkWarning.style.display = 'none';
  networkBox.style.borderBottom = '2px solid green';

  switch (ele.dataset.network) {
    case 'mtn':
      networkBox.innerHTML = "<option value='mtn' " + 'selected hidden disabled>MTN</option>';
      networkBox.dataset.network = 'mtn';
      networkBox.dataset.networkID = '1';
      break;
    case 'airtel':
      networkBox.innerHTML = "<option value='airtel' " + 'selected hidden disabled>Airtel</option>';
      networkBox.dataset.network = 'airtel';
      networkBox.dataset.networkID = '4';
      break;
    case 'glo':
      networkBox.innerHTML = "<option value='glo' " + 'selected hidden disabled>Glo</option>';
      networkBox.dataset.network = 'glo';
      networkBox.dataset.networkID = '2';
      break;
    case '9mobile':
      networkBox.innerHTML =
        "<option value='etisalat' " + 'selected  hidden disabled>9mobile' + '</option>';
      networkBox.dataset.network = '9mobile';
      networkBox.dataset.networkID = '3';
      break;
  }
  hideBox();
} // end of networkSelected

//function to be called by email info show important of email
function showEmailInfo() {
  let ele = event.currentTarget;
  let info = ele.children[0];
  if (ele.dataset.do === 'true') {
    ele.dataset.do = 'false';
    ele.style.backgroundColor = 'darkorange';
    info.style.display = 'block';

    setTimeout(() => (info.style.opacity = 1), 20);
    setTimeout(() => (info.style.opacity = 0), 4000);
    setTimeout(() => {
      info.style.display = 'none';
      ele.style.backgroundColor = '#112';
      ele.dataset.do = 'true';
    }, 5000);
  }
} // end showEmailInfo

// function handle number validator state
// function called by number validator slidder

handleValidatorState = function () {
  if (validatorState.innerHTML !== 'ON') {
    validatorState.innerHTML = 'ON';
    validatorState.style.color = 'green';
  } else {
    validatorState.innerHTML = 'OFF';
    validatorState.style.color = 'black';
  }
}; // end handlealidatorState

// function to use retrieved number from user contact

function handleContact(contact) {
  number.value = contact.tel;
}

//function to show and hide phone error box

function handlePhoneError() {
  if (phoneError.className === '') {
    phoneError.style.display = 'flex';

    setTimeout(() => (phoneError.style.opacity = 1), 50);
    setTimeout(() => (phoneError.style.opacity = 0), 2000);
    setTimeout(() => (phoneError.style.display = 'none'), 3000);
  }
} // end of handlePhoneError

const props = ['name', 'tel'];
const opts = { multiple: false };

// function to get number from user contact list

async function getContact() {
  event.preventDefault();
  handlePhoneError();
  /*try {
    const contact = await
    navigator.contacts.select(props, opts);
    alert(contact['tel']);

    handleContact(contact);
    console.log(contact);
  } catch (ex) {
    handlePhoneError();
  };*/
} // end of getContact

// function to be called by input change border color of field
// and also handle some other errors

changeBorder = function () {
  ele = event.target;
  ele.style.borderBottom = '2px solid #112';

  if (ele.checkValidity()) {
    ele.style.borderBottom = '2px solid green';

    if (ele.id === 'email') {
      emailWarning.style.display = 'none';
    }
    if (ele.id === 'amount') {
      amountWarning.style.display = 'none';
    }
  }

  if (ele.id === 'number') {
    let pass;
    // altering the value of phone field to get desired result
    let value = parseInt(ele.value);
    value = value.toString();

    if (ele.value[0] == '0') {
      if (ele.value.length == 1) {
        pass = true;
      } else {
        pass = ele.value.length - 1 == value.length;
      }
    } else {
      pass = false;
    }

    if (!pass) {
      ele.style.borderBottom = '2px solid red';
      numberWarning.style.display = 'block';
      number.dataset.pass = 'false';
      return;
    }
    numberWarning.style.display = 'none';
    number.dataset.pass = 'true';
  }
}; // end of changeBorder

// function to validate form

function formValidate() {
  let eve = event;
  if (networkBox.value === 'empty') {
    eve.preventDefault();
    _showFieldError(networkBox, networkWarning);
    return;
  }
  if (!amount.checkValidity()) {
    eve.preventDefault();
    _showFieldError(amount, amountWarning);
    return;
  }
  if (!email.checkValidity()) {
    eve.preventDefault();
    _showFieldError(email, emailWarning);
    return;
  }
  if (number.dataset.pass !== 'true' || !number.checkValidity()) {
    eve.preventDefault();
    _showFieldError(number, numberWarning);
    return;
  }
  if (validatorState.innerHTML === 'ON') {
    eve.preventDefault();
    if (!validateNumber()) return showInvalidNumberBox();
  }
  eve.preventDefault();
  eve.target.style.opacity = 0.5;
  makePayment();
}

// helper function to show warning fields
_showFieldError = function (ele, warning, offset = '160px') {
  ele.style.borderBottom = '2px solid  red';
  warning.style.display = 'block';
  if (ele.tagName == 'select') {
    return window.scrollTo(0, offset);
  }
  window.scrollTo(0, ele.offsetTop);
}; // end of _showFieldError

// function to validate phone number

validateNumber = function () {
  let num = number.value.slice(0, 4);
  switch (networkBox.dataset.network) {
    case 'mtn':
      return validNumbers.mtn.includes(num);
    case 'glo':
      return validNumbers.glo.includes(num);
    case 'airtel':
      return validNumbers.airtel.includes(num);
    case '9mobile':
      return validNumbers.nineMobile.includes(num);
  }
  return false;
}; // end of validateNumber

// function to show invalid number box

showInvalidNumberBox = function () {
  let info = `It seems the entred phone number 
     <strong class="red">is not  an/a  
     ${networkBox.dataset.network} number</strong>
       <br>
       turn off number validator to ignore
     <button class="bold"
      onclick="hideInvalidNumberBox()">ok</button`;
  blur.style.display = 'block';
  invalidNumberBox.innerHTML = info;
  invalidNumberBox.style.display = 'block';
  setTimeout(() => (invalidNumberBox.style.opacity = 1));
}; // end showInvalidNumberBox

// function to hide invalidNumberBox
hideInvalidNumberBox = function () {
  invalidNumberBox.style.opacity = 0;
  setTimeout(() => {
    invalidNumberBox.style.display = 'none';
    blur.style.display = 'none';
  }, 600);
}; // end of hideInvalidNumberBox

// function to initialise payment

makePayment = function () {
  console.log(networkBox.dataset);
  FlutterwaveCheckout({
    public_key: key,
    tx_ref: txCode(),
    amount: parseInt(amount.value),
    currency: 'NGN',
    redirect_url: 'after-pay',
    meta: {
      network: networkBox.dataset.network,
      networkID: networkBox.dataset.networkID,
      amount: amount.value,
      number: number.value,
      type: 'airtime',
    },
    customer: {
      email: email.value,
    },
    customizations: {
      title: 'BotSub',
      description: 'payment for data purchase',
      logo: 'https://botsub.com.ng/images/chatbot.png',
    },
  });
}; // end of makePayment

// function to generate tx_ref code

function txCode() {
  let code = '';
  let characters = 'ABCDEFGHIJKLMNOQRSTUZ1234567890';
  for (let x = 0; x < 25; x++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
    console.log(characters.length);
  }
  return code + Date.now();
} // end of txCode
