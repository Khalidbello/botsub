// module to serve views

import { Router } from "express";

export const router = Router();


router.get("/", (req, res)=> {
  res.redirect(303, "okkkk");
});

