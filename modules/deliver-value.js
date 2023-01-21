// module to deliver value to customer 

import { Router } from "express";

export const router = Router();


router.get("/data", (req, res)=> {
  console.log("data");
  res.render("test", {layout: null});
});

