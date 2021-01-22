const Transaction = require("../models/transaction");
const prettyjson = require("prettyjson");
const request = require("request");
const moment = require("moment");
const uuid = require("uuid");
const { errorHandler } = require("../helpers/dbErrorHandler");

const options = {
  noColor: true,
};

//  webhook endpoint to recive webhooks from Cooperative Bank
exports.coopBankWebHook = (req, res) => {
  console.log("-----------Received Cooperative Bank webhook-----------");
  // format and dump the request payload recieved from Cooperative Bank in the terminal
  console.log(prettyjson.render(req.body, options));

  console.log("-----------------------");

  if (req.body.destination.responseCode === "0") {
    let {
      messageReference,
      messageDateTime,
      messageDescription,
      source,
      destination,
    } = req.body;
    let userId = req.profile.id;

    // save transaction to database

    let fields = {
      user: userId,
      messageReference,
      narration: destination.narration,
      amount: destination.amount,
      mode: "Bank",
      transaction_id: destination.transactionID,
      transaction_date: messageDateTime,
      account_number: source.accountNumber,
      destination_accountNumber: destination.accountNumber,
      messageDescription,
    };
    let transaction = new Transaction(fields);
    transaction.save((err, result) => {
      if (err) {
        console.log("TRANSACTION CREATE ERROR ", err);
        return res.status(400).json({
          error: errorHandler(err),
        });
      }
      console.log("transaction saved successfully");
      res.json(result);
    });
  } else {
    let message = req.body.messageCode;
    console.log(req.body.Body);
    res.json(message);
  }
};

exports.generatecoopBankToken = (req, res, next) => {
  //Access token
  let consumer_key = process.env.COOP_CONSUMER_KEY; //your app consumer key
  let consumer_secret = process.env.COOP_CONSUMER_SECRET; //your app consumer secret
  let url =
    "https://developer.co-opbank.co.ke:8243/token?grant_type=client_credentials"; //Authentication url
  let auth = new Buffer.from(`${consumer_key}:${consumer_secret}`).toString(
    "base64"
  );
  console.log(auth);
  request(
    {
      url: url,
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
    (error, response, body) => {
      if (error) {
        console.log(error);
        res.json(error);
      } else {
        req.access_token = JSON.parse(body).access_token;
        console.log(response);
        console.log(req.access_token);
        next();
      }
    }
  );
};
function encodeQuery(data) {
  let query = data.url;
  for (let d in data.params)
    query +=
      encodeURIComponent(d) + "=" + encodeURIComponent(data.params[d]) + "&";
  return query.slice(0, -1);
}
//   process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

exports.processPayment = (req, res) => {
  // Json object that should be
  // converted to query parameter
  let {
    sourceAccountNumber,
    destinationAccountNumber,
    branchCode,
    referenceNumber,
    amount,
    email,
    narration,
    messageReference,
  } = req.body;
  let userId = req.profile.id;
  let access_token = "1a7e2bf3-abab-3c05-aaf7-f5a69186e0b9";

  let data = {
    url: `https://c814501fabb7.ngrok.io/api/coop/coopBankWebHook/${userId}`,
    params: {
      paid_for: narration,
    },
  };
  let callbackURL = encodeQuery(data);
  let endpoint =
    "https://developer.co-opbank.co.ke:8243/FundsTransfer/Internal/A2A/2.0.0";
  let auth = `Bearer ${access_token}`;

  request(
    {
      url: endpoint,
      // rejectUnauthorized: false,

      method: "POST",
      headers: {
        Authorization: auth,
      },
      json: {
        MessageReference: messageReference,
        CallBackUrl: callbackURL,
        Source: {
          AccountNumber: sourceAccountNumber,
          Amount: amount,
          TransactionCurrency: "KES",
          Narration: narration,
        },
        Destinations: [
          {
            ReferenceNumber: referenceNumber,
            AccountNumber: destinationAccountNumber,
            Amount: amount,
            TransactionCurrency: "KES",
            Narration: narration,
          },
        ],
      },
    },

    function (error, response, body) {
      if (error) {
        console.log(error);
      }
      res.status(200).json(body);
    }
  );
};
