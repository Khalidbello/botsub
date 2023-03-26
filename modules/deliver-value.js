// module to deliver value to customer 

import { Router } from "express";

import axios from "axios";

const url = "https://opendatasub.com/api/";

const options = {
  headers: {
    'Authorization': "Authorization: Token" + process.env.OPENSUB_KEY,
    'Content-Type': 'application/json'
  }
};

export function deliverValue(response, req, res, requirementMet) {
  if (response.type == "data") {
    deliverData();
  } else if (response.type == "airtime") {
    deliverAirtime();
  };
};


// function to make data purchase request

function deliverData() {
  
}
/*-header 'Authorization: Token 66f2e5c39ac8640f13cd888f161385b12f7e5e92' \
--header 'Content-Type: application/json' \
--data '{"network":network_id,
"mobile_number": "09095263835",
"plan": plan_id,
"Ported_number":true
}'
}; // end of deliver value function

axios.post('https://example.com/api/data', {
  key1: 'value1',
  key2: 'value2'
})
.then((response) => {
  console.log(response.data);
})
.catch((error) => {
  console.log(error);
});

router.get("/data", (req, res) => {
  console.log("data");
  res.render("test", { layout: null });
});*/

