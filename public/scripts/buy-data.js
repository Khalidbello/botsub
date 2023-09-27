let drkb = '#112';
let orange = 'darkorange';
let queryBox = document.querySelector('#query-box');
let form = document.querySelector('#form');
let networkBox = form.querySelector('#network-box');
let offerBox = form.querySelector('#offer-box');
let number = form.querySelector('#number');
let name = form.querySelector('#name');
let email = form.querySelector('#email');
let networkWarning = form.querySelector('#network-warning');
let offerWarning = form.querySelector('#offer-warning');
let emailWarning = form.querySelector('#email-warning');
let numberWarning = form.querySelector('#number-warning');
let phoneError = form.querySelector('#phone-error');
let numberValidator = form.querySelector('#number-validator');
let validatorState = form.querySelector('#validator-state');
let invalidNumberBox = document.querySelector('#invalid-number-box');
let currentBox = null;
let networks = document.querySelector('#networks');
let blur = document.querySelector('#blur');
let mtnOffers = document.querySelector('#mtn');
let airtelOffers = document.querySelector('#airtel');
let gloOffers = document.querySelector('#glo');
let nineMobileOffers = document.querySelector('#nine-mobile');
let flwKey;

let validNumbers = {
  mtn: ['0803', '0816', '0903', '0810', '0806', '0703', '0706', '0813', '0814', '0906', '0916'],
  glo: ['0805', '0905', '0807', '0811', '0705', '0815'],
  nineMobile: ['0909', '0908', '0818', '0809', '0817'],
  airtel: ['0907', '0708', '0802', '0902', '0812', '0808', '0701', '0904'],
};

/*/adding event listener for animation to networks
 networks.addEventListener("animationend",
 endListener, false);
   
 networks.addEventListener("change", networkChange, 
 false);
   
 //adding event listener to data offer boxes
 mtnOffers.addEventListener("animationend",
 endListener, false);
 
 airtelOffers.addEventListener("animationend",
 endListener, false);
 
 gloOffers.addEventListener("animationend",
 endListener, false);

 nineMobileOffers.addEventListener("animationend",
 endListener, false);
 
 //adding event listener to phoneError
 phoneError.addEventListener("animationend",
 handlePhoneError, false);*/

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
} // end of toggle navMenu
// function to fetch data and render offers for all networks

async function renderOffers() {
  const response = await fetch('front-api/data-offers');
  const datas = await response.json();
  // seting value for flwKey
  console.log(datas);
  flwKey = datas.FLW_PB_KEY;
  //alert(flwKey);

  for (let data in datas['1']) {
    _helper(datas['1'][data], mtnOffers);
  }

  for (let data in datas['2']) {
    _helper(datas['2'][data], gloOffers);
  }

  for (let data in datas['4']) {
    _helper(datas['4'][data], airtelOffers);
  }

  for (let data in datas['3']) {
    _helper(datas['3'][data], nineMobileOffers);
  }
  // for (data of dummyData.airtel) { _helper(data, airtelOffers) };

  // helper to help rendering
  function _helper(data, parent) {
    let div = document.createElement('div');
    div.className = 'data-offer bg-white shdw flex flex-sp-btw';
    div.dataset.network_id = data.networkID;
    div.dataset.plan_id = data.planID;
    div.dataset.index = data.index;
    div.dataset.size = data.size;
    div.dataset.price = data.price;
    // adding event listener to div
    div.onclick = offerSelected;

    div.innerHTML = `
      <div class="content bold  flex flex-col flex-justify-center
      flex-align-start clr-prp txt-big"> 
       &nbsp; ${data.size}         
       <span class="txt-xxsmall clr-orange"> ${data.validity} </span>
      </div>
      <div class="bold">₦${data.price}</div>
      <button class="clrw">select</button>`;
    parent.appendChild(div);
  } // end of helper function
} // end of render offers
renderOffers();

// function to show queryBox
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
};

//function to be called when the value of select network changes

function networkChange() {
  networkBox.style['border-bottom'] = '2px solid green';
  offerBox.style['border-bottom'] = '2px solid #112';
  offerBox.dataset.details = null;
  offerBox.innerHTML = '<option selected hidden' + " value='empty' disabled>••••••••</option>";
  offerBox.dataset.network = null;
}; // end networkChange

//function to hide boxes

function hideBox() {
  let ele = event.target;
  if (ele.tagName === 'svg') {
    ele.style.backgroundColor = 'darkorange';
  }

  setTimeout(() => {
    currentBox.style.top = '-500px';
    currentBox.style.opacity = 0.5;
  }, 200);

  setTimeout(() => {
    blur.style.display = 'none';
    currentBox.style.display = 'none';
    if (ele.tagName === 'svg') {
      ele.style.backgroundColor = 'transparent';
    }
  }, 500);
}; // end hideBox

// function to react to animationend

function endListener(event) {
  if (event.animationName === 'show') {
    event.target.style.top = '20vh';
  }
  if (event.animationName === 'hide') {
    event.target.style.top = '-50em';
  }
}

// function highlight clicked

highlightClicked = function (ele) {
  ele.style.opacity = 0.3;
  setTimeout(() => (ele.style.opacity = 1), 1000);
};

// function to be called when a network is selected

function networkSelected(ele) {
  highlightClicked(ele);
  networkWarning.style.display = 'none';

  if (offerBox.dataset.network !== ele.dataset.network) {
    networkChange();
  }

  console.log(ele.dataset.network);
  offerBox.dataset.network = ele.dataset.network;
  switch (ele.dataset.network) {
    case 'mtn':
      networkBox.innerHTML = "<option value='mtn' " + 'selected hidden disabled>MTN</option>';
      networkBox.dataset.network = 'mtn';
      break;
    case 'airtel':
      networkBox.innerHTML = "<option value='airtel' " + 'selected hidden disabled>Airtel</option>';
      networkBox.dataset.network = 'airtel';
      break;
    case 'glo':
      networkBox.innerHTML = "<option value='glo' " + 'selected hidden disabled>Glo</option>';
      networkBox.dataset.network = 'glo';
      break;
    case '9mobile':
      networkBox.innerHTML =
        "<option value='etisalat' " + 'selected  hidden disabled>9mobile' + '</option>';
      networkBox.dataset.network = '9mobile';
      break;
  }
  hideBox();
} // end of network selected

// function to display offers

function displayOffers(ele) {
  ele.style.display = 'block';
  setTimeout(() => {
    ele.style.top = '50px';
    ele.style.opacity = 1;
  });
}

//function to be called when offerBox is clicked

function showOffers(ele) {
  if (ele.dataset.network) {
    blur.style.display = 'block';
    console.log(ele.innerHTML);
  } else {
    _showFieldError(networkBox, networkWarning);
  }

  switch (ele.dataset.network) {
    case 'mtn':
      displayOffers(mtnOffers);
      currentBox = mtnOffers;
      break;
    case 'airtel':
      displayOffers(airtelOffers);
      currentBox = airtelOffers;
      break;
    case 'glo':
      displayOffers(gloOffers);
      currentBox = gloOffers;
      break;
    case '9mobile':
      displayOffers(nineMobileOffers);
      currentBox = nineMobileOffers;
      break;
  }
} // end of showOffers

//function to be called when an offer is selected

function offerSelected() {
  let ele = event.currentTarget;

  // setting data to be stored in offerBox
  offerBox.dataset.networkID = ele.dataset.network_id;
  offerBox.dataset.planID = ele.dataset.plan_id;
  offerBox.dataset.price = ele.dataset.price;
  offerBox.dataset.size = ele.dataset.size;
  offerBox.dataset.index = ele.dataset.index;
  console.log(offerBox.dataset.size);
  highlightClicked(ele);
  offerWarning.style.display = 'none';
  offerBox.style['border-bottom'] = '2px solid  green';

  offerBox.innerHTML =
    `<option value=${ele.dataset.plan_id} selected hidden` +
    ` disabled>${ele.dataset.size} &nbsp;  &nbsp; &nbsp;  ₦${ele.dataset.price}</option>`;
  hideBox();
} // end of offerSelected

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
    }, 4500);
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

function handleContact(contact) {
  number.value = contact.tel;
  name.value = contact.name;
}

//function to show and hide phone error box

function handlePhoneError() {
  phoneError.style.display = 'flex';
  setTimeout(() => (phoneError.style.opacity = 1), 50);
  setTimeout(() => (phoneError.style.opacity = 0), 2000);
  setTimeout(() => (phoneError.style.display = 'none'), 3000);
}

const props = ['tel'];
const opts = { multiple: false };
let contact;
//function to get number from user contact list
async function getContact() {
  event.preventDefault();
  handlePhoneError();
  /*try {
    contact = await
    navigator.contacts.select(props, opts);
    console.log("here");
    console.log(contact);

    handleContact(contact);
    console.log(contact);
  } catch (ex) {
    handlePhoneError();
  };*/
};


// function to be called  by email field and number field

changeBorder = function () {
  const ele = event.target;
  ele.style.borderBottom = '2px solid #112';

  if (ele.checkValidity()) {
    ele.style.borderBottom = '2px solid green';
    if (ele.id === 'email') {
      emailWarning.style.display = 'none';
      return;
    }
  }

  if (ele.id === 'number') {
    let pass = false;

    // altering the value of phone field to get desired result
    let value = parseInt(ele.value); // to be used in validating number field
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


// validate number when clicked
function validateNigeriaPhoneNumber(number) {
    if (number.length !== 11) {
        return false;
    }
    if (number[0] !== '0') {
        return false;
    }
    const secondDigit = parseInt(number[1]);
    if (secondDigit < 7 || secondDigit > 9) {
        return false;
    }
    for (let i = 2; i < 11; i++) {
        if (isNaN(parseInt(number[i]))) {
            return false;
        }
    }
    return true;
}; // end of validtae nigeria number


// function to validate form
function formValidate() {
  let eve = event;
  if (networkBox.value === 'empty') {
    _showFieldError(networkBox, networkWarning);
    eve.preventDefault();
    return;
  }
  if (offerBox.value === 'empty') {
    _showFieldError(offerBox, offerWarning);
    event.preventDefault();
    return;
  }
  if (!email.checkValidity()) {
    _showFieldError(email, emailWarning);
    eve.preventDefault();
    return;
  }
  if (!number.checkValidity() || !validateNigeriaPhoneNumber(number.value)) {
    _showFieldError(number, numberWarning, '10%');
    eve.preventDefault();
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
  // extracting first four digit of number for validation test
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

makePayment = function () {
  FlutterwaveCheckout({
    public_key: flwKey,
    tx_ref: txCode(),
    amount: parseInt(offerBox.dataset.price),
    currency: 'NGN',
    redirect_url: 'after-pay',
    payment_options: 'card, banktransfer, ussd',
    meta: {
      network: networkBox.dataset.network,
      networkID: offerBox.dataset.networkID,
      planID: offerBox.dataset.planID,
      size: offerBox.dataset.size,
      index: offerBox.dataset.index,
      number: number.value,
      type: 'data',
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
  let characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let x = 0; x < 16; x++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
    console.log(characters.length);
  }
  return code + Date.now();
} // end of txCode
//alert(txCode())
