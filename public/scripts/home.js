// home.js file

// function to change window location
function changeLocation () {
  const ele = event.target;
  
  ele.style.backgroundColor = 'darkorange';
  ele.style.color = 'white';
  
  setTimeout(()=> {
    ele.style.backgroundColor = 'white';
    ele.style.color = 'darkorange';
  }, 300);
  
  setTimeout(()=> window.location = ele.dataset.location, 500);
}; // end of changeLocation