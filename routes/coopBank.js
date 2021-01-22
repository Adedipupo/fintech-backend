const express = require("express");
const router = express.Router();

const { requireSignin, isAuth } = require("../controllers/auth");
const { userById } = require("../controllers/user");
const {
  generatecoopBankToken,
  processPayment,
  coopBankWebHook,
} = require("../controllers/coopBank");

router.get("/coop/getToken", generatecoopBankToken);
router.post(
  "/coop/payment/processPayment/:userId",
  requireSignin,
  isAuth,
  generatecoopBankToken,
  processPayment
);
router.post("/coop/coopBankWebHook/:userId", coopBankWebHook);
router.param("userId", userById);

module.exports = router;
