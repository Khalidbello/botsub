// module for frontend api
import {Router} from "express";

import {default as fs} from "node:fs"; 

const fsP = fs.promises;


export const router = Router();

router.get("/data-offers", async (req, res)=> {
  let dataOffers = await fsP.readFile("files/data-details.json");
  dataOffers = JSON.parse(dataOffers);
  res.json(dataOffers)
});

// route to recieve and  save survey datas
router.post("/survey", async (req, res)=> {
  res.json({status: "success"});
  console.log(req.body);
})