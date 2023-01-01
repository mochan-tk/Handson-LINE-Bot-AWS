// https://github.com/awsdocs/aws-lambda-developer-guide/blob/main/sample-apps/nodejs-apig/function/index.js

const AWS = require('aws-sdk');
const line = require('@line/bot-sdk');
const crypto = require("crypto");

const s3 = new AWS.S3();

// https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html
const documentClient = new AWS.DynamoDB.DocumentClient();

// https://github.com/line/line-bot-sdk-nodejs/blob/next/examples/echo-bot/index.js
// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.MSG_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.MSG_CHANNEL_SECRET,
};

// create LINE SDK client
const client = new line.Client(config);

/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */
 
export const handler = (event) => {
    console.log(process.env.BUCKET_NAME);
    console.log(crypto.randomUUID());
    const signature = event.headers["x-line-signature"];
    
    if (!signature) {
        throw new line.SignatureValidationFailed("no signature");
    }
    
    if (!line.validateSignature(event.body, config.channelSecret, signature)) {
        throw new line.SignatureValidationFailed("signature validation failed", signature);
    }

    const body = JSON.parse(event.body);
    Promise.all(body.events.map(eventHandler))
        .then((result) => {
            console.log(result);
        })
        .catch((err) => {
            console.error(err);
            return {
                statusCode: 500,
                body: JSON.stringify('Server Error'),
                headers: {
                    'Content-Type': 'application/json',
                }
            };
        });

    return {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
        headers: {
            'Content-Type': 'application/json',
        }
    };
};

const eventHandler = async (event) => {
  const userId = event.source.userId;
  
  if (event.type !== 'message' && event.type !== 'postback') {
    // ignore non-text-message event
    return Promise.resolve(null);
  } else if (event.type === 'postback') {
    if (event.postback.data === 'sticker') {
      //https://developers.line.biz/ja/reference/messaging-api/#sticker-message
      //https://developers.line.biz/ja/docs/messaging-api/sticker-list/#sticker-definitions
      return client.replyMessage(event.replyToken,{
        type: 'sticker',
        packageId: "11537",
        stickerId: "52002735"
      });
    }
  
  } else if (event.message.type === 'text') {
    if (event.message.text === 'flex') {
      //https://developers.line.biz/ja/reference/messaging-api/#flex-message
      return client.replyMessage(event.replyToken,{
        type: 'flex',
        altText: 'item list',
        contents: flexMsg
      });
    } else if (event.message.text === 'quick') {
      //https://developers.line.biz/ja/reference/messaging-api/#quick-reply
      return client.replyMessage(event.replyToken,{
        type: 'text',
        text: 'ステッカー欲しいですか❓YesかNoで答えてください, もしくは素敵な写真送って❗️',
        "quickReply": {
          "items": [
            {
              "type": "action",
              "action": {
                "type":"postback",
                "label":"Yes",
                "data": "sticker",
                "displayText":"ステッカーください❗️"
              }
            },
            {
              "type": "action",
              "action": {
                "type":"message",
                "label":"No",
                "text":"不要。"
              }
            },
            {
              "type": "action",
              "action": {
                "type": "camera",
                "label": "camera"
              }
            }
          ]
        }
      });
    }
  } else if (event.message.type === 'image') {
    //https://developers.line.biz/ja/reference/messaging-api/#image-message
    const stream = await client.getMessageContent(event.message.id);
    const file = await getStreamData(stream);
    const uploadFileName = `${crypto.randomUUID()}.jpg`;
    let bucketParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: uploadFileName,
        ContentType: "image/jpeg",
        Body: Buffer.concat(file)
    };
    await s3.putObject(bucketParams, function (err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        console.log(data);
      }
    });
    return client.replyMessage(event.replyToken,{
      type: 'image',
      originalContentUrl: `https://${process.env.BUCKET_DOMAIN_NAME}/${uploadFileName}`,
      previewImageUrl: `https://${process.env.BUCKET_DOMAIN_NAME}/${uploadFileName}`
    });

  } else if (event.message.type === 'audio') {
    //https://developers.line.biz/ja/reference/messaging-api/#audio-message
    //durationはこれでとれそう？ > https://www.npmjs.com/package/mp3-duration
    const stream = await client.getMessageContent(event.message.id);
    const file = await getStreamData(stream);
    const uploadFileName = `${crypto.randomUUID()}.mp3`;
    let bucketParams = {
        Bucket: process.env.BUCKET_NAME,
        Key: uploadFileName,
        ContentType: "audio/mpeg",
        Body: Buffer.concat(file)
    };
    await s3.putObject(bucketParams, function (err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        console.log(data);
      }
    });
    return client.replyMessage(event.replyToken,{
      type: 'audio',
      originalContentUrl: `https://${process.env.BUCKET_DOMAIN_NAME}/${uploadFileName}`,
      duration: 60000
    });
  } else if (event.message.type === 'location') {
    //https://developers.line.biz/ja/reference/messaging-api/#location-message
    return client.replyMessage(event.replyToken,{
      type: 'location',
      title: 'my location',
      address: event.message.address,
      latitude: event.message.latitude,
      longitude: event.message.longitude
    });
  }



/*

  let scanParams = {
      TableName: 'Table1',
      ExpressionAttributeNames:{
          '#u': 'userId'
      },
      ExpressionAttributeValues:{
          ':userId': userId
      },
      KeyConditionExpression: '#u = :userId'
  };
  let scanResult = await documentClient.query(scanParams).promise();

  let putParams = {
      TableName: 'Table1',
      Item:{
           userId: userId,
           category: 'カテゴリー３'
      }
  };
  let putResult = await documentClient.put(putParams).promise();

*/



  // create a echoing text message
  const echo = { type: 'text', text: event.message.text };

  // use reply API
  return client.replyMessage(event.replyToken, echo);
}

const getStreamData = async (stream)  => {
    return new Promise(resolve => {
      let result = [];
      stream.on("data", (chunk) => {
        result.push(Buffer.from(chunk));
      });
      stream.on("end", () => {
        resolve(result);
      });
    });
}

//https://developers.line.biz/flex-simulator/
const flexMsg = {
  "type": "carousel",
  "contents": [
    {
      "type": "bubble",
      "hero": {
        "type": "image",
        "size": "full",
        "aspectRatio": "20:13",
        "aspectMode": "cover",
        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_5_carousel.png"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "text",
            "text": "Arm Chair, White",
            "wrap": true,
            "weight": "bold",
            "size": "xl"
          },
          {
            "type": "box",
            "layout": "baseline",
            "contents": [
              {
                "type": "text",
                "text": "$49",
                "wrap": true,
                "weight": "bold",
                "size": "xl",
                "flex": 0
              },
              {
                "type": "text",
                "text": ".99",
                "wrap": true,
                "weight": "bold",
                "size": "sm",
                "flex": 0
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "action": {
              "type": "uri",
              "label": "Add to Cart",
              "uri": "https://linecorp.com"
            }
          },
          {
            "type": "button",
            "action": {
              "type": "uri",
              "label": "Add to wishlist",
              "uri": "https://linecorp.com"
            }
          }
        ]
      }
    },
    {
      "type": "bubble",
      "hero": {
        "type": "image",
        "size": "full",
        "aspectRatio": "20:13",
        "aspectMode": "cover",
        "url": "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_6_carousel.png"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "text",
            "text": "Metal Desk Lamp",
            "wrap": true,
            "weight": "bold",
            "size": "xl"
          },
          {
            "type": "box",
            "layout": "baseline",
            "flex": 1,
            "contents": [
              {
                "type": "text",
                "text": "$11",
                "wrap": true,
                "weight": "bold",
                "size": "xl",
                "flex": 0
              },
              {
                "type": "text",
                "text": ".99",
                "wrap": true,
                "weight": "bold",
                "size": "sm",
                "flex": 0
              }
            ]
          },
          {
            "type": "text",
            "text": "Temporarily out of stock",
            "wrap": true,
            "size": "xxs",
            "margin": "md",
            "color": "#ff5551",
            "flex": 0
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "flex": 2,
            "style": "primary",
            "color": "#aaaaaa",
            "action": {
              "type": "uri",
              "label": "Add to Cart",
              "uri": "https://linecorp.com"
            }
          },
          {
            "type": "button",
            "action": {
              "type": "uri",
              "label": "Add to wish list",
              "uri": "https://linecorp.com"
            }
          }
        ]
      }
    },
    {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "flex": 1,
            "gravity": "center",
            "action": {
              "type": "uri",
              "label": "See more",
              "uri": "https://linecorp.com"
            }
          }
        ]
      }
    }
  ]
}
