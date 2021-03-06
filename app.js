// Native Variables

	"use strict";

	const apiai = require('apiai');
	const config = require('./config');
	const express = require('express');
	const crypto = require('crypto');
	const bodyParser = require('body-parser');
	const request = require('request');
	const app = express();
	const uuid = require('uuid');

// Messenger API parameters

	if (!config.FB_PAGE_TOKEN) {
		throw new Error('missing FB_PAGE_TOKEN');
	}
	if (!config.FB_VERIFY_TOKEN) {
		throw new Error('missing FB_VERIFY_TOKEN');
	}
	if (!config.API_AI_CLIENT_ACCESS_TOKEN) {
		throw new Error('missing API_AI_CLIENT_ACCESS_TOKEN');
	}
	if (!config.FB_APP_SECRET) {
		throw new Error('missing FB_APP_SECRET');
	}
	if (!config.SERVER_URL) { // used for ink to static files
		throw new Error('missing SERVER_URL');
	}
	if (!config.OPEN_WEATHER_API_KEY) { // weather api key
		throw new Error('missing OPEN_WEATHER_API_KEY');
	}

// Express Setup

	app.set('port', (process.env.PORT || 5000));

	app.use(bodyParser.json({
		verify: verifyRequestSignature
	}));

	app.use(express.static('public'));

	app.use(bodyParser.urlencoded({
		extended: false
	}));

	app.use(bodyParser.json());

// Database

	var mongoose = require("mongoose");
	var url = process.env.DATABASEURL || "mongodb://agentaiapp:agentaiapp123@ds035270.mlab.com:35270/agentai";
	mongoose.connect(url);
	mongoose.Promise = require('bluebird');

// Models

	var Property = require("./models/property");
	var Account = require("./models/account");

// API AI

	const apiAiService = apiai(config.API_AI_CLIENT_ACCESS_TOKEN, {
		language: "en",
		requestSource: "fb"
	});

	const sessionIds = new Map();

// Routes

	app.get('/', function (req, res) {
		res.send('Hello world, I am a chat bot');
	});

	// Facebook

	app.get('/webhook/', function (req, res) {
		console.log("request");
		if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === config.FB_VERIFY_TOKEN) {
			res.status(200).send(req.query['hub.challenge']);
		} else {
			console.error("Failed validation. Make sure the validation tokens match.");
			res.sendStatus(403);
		}
	});

	/* All callbacks for Messenger are POST-ed. They will be sent to the same webhook. Be sure to subscribe your app to your page to receive callbacks for your page. https://developers.facebook.com/docs/messenger-platform/product-overview/setup#subscribe_app */

	app.post('/webhook/', function (req, res) {
		var data = req.body;
		console.log(JSON.stringify(data));

		// Make sure this is a page subscription

		if (data.object == 'page') {

			// Iterate over each entry
			// There may be multiple if batched

			data.entry.forEach(function (pageEntry) {
				var pageID = pageEntry.id;
				var timeOfEvent = pageEntry.time;

				// Iterate over each messaging event

				pageEntry.messaging.forEach(function (messagingEvent) {
					if (messagingEvent.optin) {
						receivedAuthentication(messagingEvent);
					}
					else if (messagingEvent.message) {
						receivedMessage(messagingEvent);
					}
					else if (messagingEvent.delivery) {
						receivedDeliveryConfirmation(messagingEvent);
					}
					else if (messagingEvent.postback) {
						receivedPostback(messagingEvent);
					}
					else if (messagingEvent.read) {
						receivedMessageRead(messagingEvent);
					}
					else if (messagingEvent.account_linking) {
						receivedAccountLink(messagingEvent);
					}
					else {
						console.log("Webhook received unknown messagingEvent: ", messagingEvent);
					}
				});
			});

			// Assume all went well.
			// You must send back a 200, within 20 seconds

			res.sendStatus(200);
		}
	});

// Function Defenitions

	function receivedMessage(event) {

		var senderID = event.sender.id;
		var recipientID = event.recipient.id;
		var timeOfMessage = event.timestamp;
		var message = event.message;

		if (!sessionIds.has(senderID)) {
			sessionIds.set(senderID, uuid.v1());
		}

		//console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
		//console.log(JSON.stringify(message));

		var isEcho = message.is_echo;
		var messageId = message.mid;
		var appId = message.app_id;
		var metadata = message.metadata;

		// You may get a text or attachment but not both

		var messageText = message.text;
		var messageAttachments = message.attachments;
		var quickReply = message.quick_reply;

		if (isEcho) {
			handleEcho(messageId, appId, metadata);
			return;
		}
		else if (quickReply) {
			handleQuickReply(senderID, quickReply, messageId);
			return;
		}

		if (messageText) {

			// Send message to api.ai

			sendToApiAi(senderID, messageText);
		}
		else if (messageAttachments) {
			handleMessageAttachments(messageAttachments, senderID);
		}
	}

	function handleMessageAttachments(messageAttachments, senderID) {
		// For now just reply

		sendTextMessage(senderID, "Attachment received. Thank you.");	
	}

	function handleQuickReply(senderID, quickReply, messageId) {
		var quickReplyPayload = quickReply.payload;
		console.log("Quick reply for message %s with payload %s", messageId, quickReplyPayload);

		// Send payload to api.ai

		sendToApiAi(senderID, quickReplyPayload);
	}

	function handleEcho(messageId, appId, metadata) {
		// https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-echo
		// Just logging message echoes to console
		console.log("Received echo for message %s and app %d with metadata %s", messageId, appId, metadata);
	}

	function handleApiAiAction(sender, action, responseText, contexts, parameters) {
		switch (action) {
			case "property-action-search":
				if (isDefined(contexts[0]) && contexts[0].parameters) {

					let prm = contexts[0].parameters;
					let replies = [{
						"content_type":"text",
						"title":"9am",
						"payload":"9am"
					}, {
						"content_type":"text",
						"title":"10am",
						"payload":"10am"
					}, {
						"content_type":"text",
						"title":"11am",
						"payload":"11am"
					}, {
						"content_type":"text",
						"title":"12pm",
						"payload":"12pm"
					}];

					var obj = {
						"property_param_address": prm["property_param_address"],
						"property_param_action_type": prm["property_param_action_type"]
					}

					if (obj.property_param_address !== "" && obj.property_param_action_type !== "") {

						var tmp_address_array = function(str) {
							var a = str.replace(/\W+/g, " ");
							var b = a.split(" ");
    						var c = [];
							for(var i=0; i<b.length; i++) {
								if (i > 1) {
									c.push(new RegExp(b[i], "i"));
								}
								else {
									c.push(b[i]);
								}
							}

							return c;
						};

						var tmp_address = tmp_address_array(obj.property_param_address);

						Property.findOne({$or: [{
							"subNumber": {$in: tmp_address}}, {
							"streetNumber": {$in: tmp_address}}], $or: [{
							"streetName": {$in: tmp_address}}, {
							"suburb": {$in: tmp_address}},
						], "archive": false}).populate("account").exec(function(err, res) {
							if (err) {
								console.log(err);
							}
							else {
								if (res) {

									sendGenericMessage(sender, [{
										"title": "Propety for "+res.listingType,
										"image_url": "http://cdn1-www.cattime.com/assets/uploads/gallery/persian-cats-and-kittens/persian-cats-and-kittens-8.jpg",
										"subtitle": (res.subNumber !== "" ? res.subNumber+"/ " : "")+res.streetNumber+" "+res.streetName+" "+res.suburb+", "+res.state+" "+res.postcode,
										"default_action": {
											"type": "web_url",
											"url": "https://morning-retreat-82821.herokuapp.com/booking?user="+res.account.user[0]+"&property="+res._id,
											"messenger_extensions": true,
											"webview_height_ratio": "tall",
											"fallback_url": "https://getaire.com.au/"
										},
										"buttons":[{
											"type":"web_url",
											"url": "https://morning-retreat-82821.herokuapp.com/booking?user="+res.account.user[0]+"&property="+res._id,
											"title":"View Time Slots"
										}, {
											"type":"web_url",
											"url": "https://getaire.com.au/",
											"title":"Checkout Aire"
										}]
									}]);

									// sendTextMessage(sender, "Lucky! "+obj.property_param_address+" is currently for "+res.listingType+" and is available for "+obj.property_param_action_type+"!");
								}
								else {
									sendTextMessage(sender, "Sorry, but "+obj.property_param_address+" isn't available");
								}
							}
						});
					}
				}
				sendTextMessage(sender, responseText);
			break;
			case "weather-action-get":
				if (parameters.hasOwnProperty("weather_param_city") && parameters["weather_param_city"] !== "") {
					request({
						"url": "http://api.openweathermap.org/data/2.5/weather",
						"qs": {
							"appid": config.OPEN_WEATHER_API_KEY,
							"q": parameters["weather_param_city"]
						}
					}, function(err, res, body) {
						if (err) {
							console.log(err);
						}
						else {
							let weather = JSON.parse(body);
							if (weather.hasOwnProperty("weather")) {
								let reply = `${responseText} ${weather["weather"][0]["description"]}`;
								sendTextMessage(sender, reply);
							}
							else {
								sendTextMessage(sender, `No weather forecast available for ${parameters["geo-city"]}`);
							}
						}
					});
				}
				else {
					sendTextMessage(sender, responseText);
				}
			break;
			default:
				// Unhandled action, just send back the text

				sendTextMessage(sender, responseText);
			break;
		}
	}

	function handleMessage(message, sender) {
		switch (message.type) {
			case 0: // Text
				sendTextMessage(sender, message.speech);
			break;

			case 2: // Quick Replies
				let replies = [];
				for (var b = 0; b < message.replies.length; b++) {
					let reply = {
						"content_type": "text",
						"title": message.replies[b],
						"payload": message.replies[b]
					}
					replies.push(reply);
				}
				sendQuickReply(sender, message.title, replies);
			break;

			case 3: // Image
				sendImageMessage(sender, message.imageUrl);
			break;

			case 4: // Custom Payload
				var messageData = {
					recipient: {
						id: sender
					},
					message: message.payload.facebook

				};
				callSendAPI(messageData);
			break;
		}
	}

	function handleCardMessages(messages, sender) {
		let elements = [];

		for (var m=0; m<messages.length; m++) {
			let message = messages[m];
			let buttons = [];
			for (var b=0; b<message.buttons.length; b++) {
				let isLink = (message.buttons[b].postback.substring(0, 4) === 'http');
				let button;
				if (isLink) {
					button = {
						"type": "web_url",
						"title": message.buttons[b].text,
						"url": message.buttons[b].postback
					}
				}
				else {
					button = {
						"type": "postback",
						"title": message.buttons[b].text,
						"payload": message.buttons[b].postback
					}
				}
				buttons.push(button);
			}


			let element = {
				"title": message.title,
				"image_url":message.imageUrl,
				"subtitle": message.subtitle,
				"buttons": buttons
			};
			elements.push(element);
		}
		sendGenericMessage(sender, elements);
	}

	function handleApiAiResponse(sender, response) {
		let responseText = response.result.fulfillment.speech;
		let responseData = response.result.fulfillment.data;
		let messages = response.result.fulfillment.messages;
		let action = response.result.action;
		let contexts = response.result.contexts;
		let parameters = response.result.parameters;

		sendTypingOff(sender);

		if (isDefined(messages) && (messages.length == 1 && messages[0].type != 0 || messages.length > 1)) {
			let timeoutInterval = 1100;
			let previousType ;
			let cardTypes = [];
			let timeout = 0;
			for (var i=0; i<messages.length; i++) {
				if (previousType == 1 && (messages[i].type != 1 || i == messages.length - 1)) {
					timeout = (i - 1) * timeoutInterval;
					setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
					cardTypes = [];
					timeout = i * timeoutInterval;
					setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
				}
				else if (messages[i].type == 1 && i == messages.length - 1) {
					cardTypes.push(messages[i]);
					timeout = (i - 1) * timeoutInterval;
					setTimeout(handleCardMessages.bind(null, cardTypes, sender), timeout);
					cardTypes = [];
				}
				else if (messages[i].type == 1) {
					cardTypes.push(messages[i]);
				}
				else {
					timeout = i * timeoutInterval;
					setTimeout(handleMessage.bind(null, messages[i], sender), timeout);
				}
				previousType = messages[i].type;
			}
		}
		else if (responseText == '' && !isDefined(action)) {
			// api ai could not evaluate input.

			console.log('Unknown query' + response.result.resolvedQuery);
			sendTextMessage(sender, "I'm not sure what you want. Can you be more specific?");
		}
		else if (isDefined(action)) {
			handleApiAiAction(sender, action, responseText, contexts, parameters);
		}
		else if (isDefined(responseData) && isDefined(responseData.facebook)) {
			try {
				console.log('Response as formatted message' + responseData.facebook);
				sendTextMessage(sender, responseData.facebook);
			} catch (err) {
				sendTextMessage(sender, err.message);
			}
		}
		else if (isDefined(responseText)) {
			sendTextMessage(sender, responseText);
		}
	}

	function sendToApiAi(sender, text) {

		sendTypingOn(sender);

		if (!sessionIds.has(sender)) {
			sessionIds.set(sender, uuid.v1());
		}

		let apiaiRequest = apiAiService.textRequest(text, {
			sessionId: sessionIds.get(sender)
		});

		console.log(sender, sessionIds.get(sender));

		apiaiRequest.on('response', (response) => {
			if (isDefined(response.result)) {
				handleApiAiResponse(sender, response);
			}
		});

		apiaiRequest.on('error', (error) => console.error(error));
		apiaiRequest.end();
	}

	function sendTextMessage(recipientId, text, replies, metadata, callback) {
		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				text: text,
				metadata: (isDefined(metadata) ? metadata : ""),
				quick_replies: replies
			}
		}
		callSendAPI(messageData, callback);
	}

	function sendImageMessage(recipientId, imageUrl) {
		// Send an image using the Send API.

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "image",
					payload: {
						url: imageUrl
					}
				}
			}
		};
		callSendAPI(messageData);
	}

	function sendGifMessage(recipientId) {
		// Send a Gif using the Send API.

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "image",
					payload: {
						url: config.SERVER_URL + "/assets/instagram_logo.gif"
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function sendAudioMessage(recipientId) {
		// Send audio using the Send API.

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "audio",
					payload: {
						url: config.SERVER_URL + "/assets/sample.mp3"
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function sendVideoMessage(recipientId, videoName) {
		// Send a video using the Send API.
		// Example videoName: "/assets/allofus480.mov"

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "video",
					payload: {
						url: config.SERVER_URL + videoName
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function sendFileMessage(recipientId, fileName) {
		// Send a File using the Send API.
		// Example fileName: fileName"/assets/test.txt"

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "file",
					payload: {
						url: config.SERVER_URL + fileName
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function sendButtonMessage(recipientId, text, buttons) {
		// Send a button message using the Send API.

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "template",
					payload: {
						template_type: "button",
						text: text,
						buttons: buttons
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function sendGenericMessage(recipientId, elements) {
		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "template",
					payload: {
						template_type: "generic",
						elements: elements
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function sendReceiptMessage(recipientId, recipient_name, currency, payment_method, timestamp, elements, address, summary, adjustments) {
		// Generate a random receipt ID as the API requires a unique ID

		var receiptId = "order" + Math.floor(Math.random() * 1000);

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "template",
					payload: {
						template_type: "receipt",
						recipient_name: recipient_name,
						order_number: receiptId,
						currency: currency,
						payment_method: payment_method,
						timestamp: timestamp,
						elements: elements,
						address: address,
						summary: summary,
						adjustments: adjustments
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function sendQuickReply(recipientId, text, replies, metadata) {
		// Send a message with Quick Reply buttons.

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				text: text,
				metadata: isDefined(metadata)?metadata:'',
				quick_replies: replies
			}
		};

		callSendAPI(messageData);
	}

	function sendReadReceipt(recipientId) {
		// Send a read receipt to indicate the message has been read

		var messageData = {
			recipient: {
				id: recipientId
			},
			sender_action: "mark_seen"
		};

		callSendAPI(messageData);
	}

	function sendTypingOn(recipientId) {
		// Turn typing indicator on

		var messageData = {
			recipient: {
				id: recipientId
			},
			sender_action: "typing_on"
		};

		callSendAPI(messageData);
	}

	function sendTypingOff(recipientId) {
		// Turn typing indicator off

		var messageData = {
			recipient: {
				id: recipientId
			},
			sender_action: "typing_off"
		};

		callSendAPI(messageData);
	}

	function sendAccountLinking(recipientId) {
		// Send a message with the account linking call-to-action

		var messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				attachment: {
					type: "template",
					payload: {
						template_type: "button",
						text: "Welcome. Link your account.",
						buttons: [{
							type: "account_link",
							url: config.SERVER_URL + "/authorize"
						}]
					}
				}
			}
		};

		callSendAPI(messageData);
	}

	function greetUserText(userId) {
		// First read user firstname

		request({
			uri: 'https://graph.facebook.com/v2.7/'+userId,
			qs: {
				access_token: config.FB_PAGE_TOKEN
			}
		}, function (error, response, body) {
			if (!error && response.statusCode == 200) {

				var user = JSON.parse(body);

				if (user.first_name) {
					console.log("FB user: %s %s, %s", user.first_name, user.last_name, user.gender);

					sendTextMessage(userId, "Welcome to Aire I'll be your assistant here. I can search properties, book property inspections, property appraisals and almost anything related to empty lawn haha, just kidding. So "+user.first_name.split(" ")[0]+", what can I do for you today?");
				}
				else {
					console.log("Cannot get data for fb user with id", userId);
				}
			}
			else {
				console.error(response.error);
			}
		});
	}

	function callSendAPI(messageData, callback) {
		// Call the Send API. The message data goes in the body. If successful, we'll get the message id in a response

		request({
			uri: 'https://graph.facebook.com/v2.6/me/messages',
			qs: {
				access_token: config.FB_PAGE_TOKEN
			},
			method: 'POST',
			json: messageData

		}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				var recipientId = body.recipient_id;
				var messageId = body.message_id;

				if (messageId) {
					console.log("Successfully sent message with id %s to recipient %s", messageId, recipientId);
				}
				else {
					console.log("Successfully called Send API for recipient %s", recipientId);
				}
				if (callback) {
					callback(data);
				}
			}
			else {
				console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
			}
		});
	}

	function receivedPostback(event) {
		// This event is called when a postback is tapped on a Structured Message. 
		// https://developers.facebook.com/docs/messenger-platform/webhook-reference/postback-received

		var senderID = event.sender.id;
		var recipientID = event.recipient.id;
		var timeOfPostback = event.timestamp;

		// The 'payload' param is a developer-defined field which is set in a postback 
		// button for Structured Messages. 

		var payload = event.postback.payload;

		switch (payload) {
			case "pb_aire_get_started":
				greetUserText(senderID); 
			break;
			case "pb_aire_property_discover":

			break;
			case "pb_aire_property_inspections":
				sendToApiAi(senderID, "property enquiry");
			break;
			case "pb_aire_property_appraisal":

			break;
			default:
				// Unindentified payload

				sendTextMessage(senderID, "I'm not sure what you want. Can you be more specific?");
			break;
		}

		console.log("Received postback for user %d and page %d with payload '%s'"+" at %d", senderID, recipientID, payload, timeOfPostback);
	}

	function receivedMessageRead(event) {
		// This event is called when a previously-sent message has been read.
		// https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-read

		var senderID = event.sender.id;
		var recipientID = event.recipient.id;

		// All messages before watermark (a timestamp) or sequence have been seen.
		var watermark = event.read.watermark;
		var sequenceNumber = event.read.seq;

		console.log("Received message read event for watermark %d and sequence "+"number %d", watermark, sequenceNumber);
	}

	function receivedAccountLink(event) {
		// This event is called when the Link Account or UnLink Account action has been tapped.
		// https://developers.facebook.com/docs/messenger-platform/webhook-reference/account-linking

		var senderID = event.sender.id;
		var recipientID = event.recipient.id;

		var status = event.account_linking.status;
		var authCode = event.account_linking.authorization_code;

		console.log("Received account link event with for user %d with status %s "+"and auth code %s ", senderID, status, authCode);
	}

	function receivedDeliveryConfirmation(event) {
		// This event is sent to confirm the delivery of a message. Read more about these fields at
		// https://developers.facebook.com/docs/messenger-platform/webhook-reference/message-delivered

		var senderID = event.sender.id;
		var recipientID = event.recipient.id;
		var delivery = event.delivery;
		var messageIDs = delivery.mids;
		var watermark = delivery.watermark;
		var sequenceNumber = delivery.seq;

		if (messageIDs) {
			messageIDs.forEach(function (messageID) {
				console.log("Received delivery confirmation for message ID: %s",
					messageID);
			});
		}

		console.log("All message before %d were delivered.", watermark);
	}

	function receivedAuthentication(event) {
		// The value for 'optin.ref' is defined in the entry point. For the "Send to Messenger" plugin, it is the 'data-ref' field. Read more at 
 		// https://developers.facebook.com/docs/messenger-platform/webhook-reference/authentication

		var senderID = event.sender.id;
		var recipientID = event.recipient.id;
		var timeOfAuth = event.timestamp;

		// The 'ref' field is set in the 'Send to Messenger' plugin, in the 'data-ref'
		// The developer can set this to an arbitrary value to associate the authentication callback with the 'Send to Messenger' click event.
		// This is a way to do account linking when the user clicks the 'Send to Messenger' plugin.

		var passThroughParam = event.optin.ref;

		console.log("Received authentication for user %d and page %d with pass " +
			"through param '%s' at %d", senderID, recipientID, passThroughParam,
			timeOfAuth);

		// When an authentication is received, we'll send a message back to the sender to let them know it was successful.

		sendTextMessage(senderID, "Authentication successful");
	}

	function verifyRequestSignature(req, res, buf) {
		// Verify that the callback came from Facebook.
		// Using the App Secret from the App Dashboard, we can verify the signature that is sent with each callback in the x-hub-signature field, located in the header.
		// https://developers.facebook.com/docs/graph-api/webhooks#setup

		var signature = req.headers["x-hub-signature"];

		if (!signature) {
			throw new Error('Couldn\'t validate the signature.');
		} else {
			var elements = signature.split('=');
			var method = elements[0];
			var signatureHash = elements[1];

			var expectedHash = crypto.createHmac('sha1', config.FB_APP_SECRET)
				.update(buf)
				.digest('hex');

			if (signatureHash != expectedHash) {
				throw new Error("Couldn't validate the request signature.");
			}
		}
	}

	function isDefined(obj) {
		if (typeof obj == 'undefined') {
			return false;
		}

		if (!obj) {
			return false;
		}

		return obj != null;
	}

// Server

	app.listen(app.get('port'), function () {
		process.stdout.write('\x1Bc'); 
		console.log("");
		console.log("Chatbot is Alive!");
	});
