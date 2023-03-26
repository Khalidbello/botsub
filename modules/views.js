// module to serve views

import { Router } from "express";

export const router = Router();


router.get("/", (req, res)=> {
  res.send("<h2>hello world</h2>");
});

